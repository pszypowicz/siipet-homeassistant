"""Config flow for the SiiPet integration."""

from __future__ import annotations

from collections.abc import Mapping
import logging
from typing import Any
import uuid

from homeassistant.config_entries import (
    SOURCE_REAUTH,
    SOURCE_RECONFIGURE,
    ConfigEntry,
    ConfigFlow,
    ConfigFlowResult,
    OptionsFlowWithReload,
)
from homeassistant.const import CONF_EMAIL
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
    NumberSelector,
    NumberSelectorConfig,
    NumberSelectorMode,
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)
import voluptuous as vol

from .api import (
    Session,
    SiiPetApiError,
    SiiPetAuthError,
    SiiPetClient,
    SiiPetConnectionError,
    SiiPetError,
)
from .api.client import TOO_MANY_REQUESTS, WRONG_CODE
from .const import (
    AUTH_EMAIL,
    AUTH_TOKEN,
    CONF_AUTH_METHOD,
    CONF_CLIENT_ID,
    CONF_CODE,
    CONF_EXPIRE_AT,
    CONF_MEDIA_DAYS,
    CONF_TOKEN,
    DEFAULT_MEDIA_DAYS,
    DOMAIN,
    MAX_MEDIA_DAYS,
    SESSION_KEYS,
)

_LOGGER = logging.getLogger(__name__)

EMAIL_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_EMAIL): TextSelector(
            TextSelectorConfig(type=TextSelectorType.EMAIL, autocomplete="email")
        )
    }
)
CODE_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_CODE): TextSelector(
            TextSelectorConfig(autocomplete="one-time-code")
        )
    }
)

OPTIONS_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_MEDIA_DAYS, default=DEFAULT_MEDIA_DAYS): vol.All(
            NumberSelector(
                NumberSelectorConfig(
                    min=0,
                    max=MAX_MEDIA_DAYS,
                    step=1,
                    mode=NumberSelectorMode.BOX,
                    unit_of_measurement="days",
                )
            ),
            vol.Coerce(int),
        )
    }
)


class SiiPetConfigFlow(ConfigFlow, domain=DOMAIN):
    """Sign in to a SiiPet account with an emailed code."""

    VERSION = 1

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: ConfigEntry) -> SiiPetOptionsFlow:
        """Return the flow that sets the days of local media."""
        return SiiPetOptionsFlow()

    def __init__(self) -> None:
        """Start a flow with a new client identifier."""
        self._email = ""
        self._client_id = str(uuid.uuid4())

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Start with the email step."""
        return await self.async_step_email()

    async def async_step_email(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for the email address and request a code."""
        errors: dict[str, str] = {}
        if user_input is not None:
            email = user_input[CONF_EMAIL].strip()
            if "@" not in email:
                errors[CONF_EMAIL] = "invalid_email"
            else:
                errors = await self._async_request_code(email)
            if not errors:
                self._email = email
                return await self.async_step_code()
        return self.async_show_form(
            step_id="email",
            data_schema=self.add_suggested_values_to_schema(
                EMAIL_SCHEMA, user_input or {CONF_EMAIL: self._email}
            ),
            errors=errors,
        )

    async def async_step_code(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for the emailed code and sign in."""
        errors: dict[str, str] = {}
        if user_input is not None:
            client = self._client()
            try:
                session = await client.login(self._email, user_input[CONF_CODE].strip())
                user_id = session.user_id
            except SiiPetConnectionError:
                errors["base"] = "cannot_connect"
            except SiiPetApiError as err:
                if err.code == WRONG_CODE:
                    errors[CONF_CODE] = "invalid_code"
                elif err.code == TOO_MANY_REQUESTS:
                    errors["base"] = "too_many_requests"
                else:
                    _LOGGER.debug("Sign-in rejected: %s", err)
                    errors["base"] = "login_failed"
            except SiiPetAuthError:
                errors["base"] = "login_failed"
            except SiiPetError:
                _LOGGER.exception("Unexpected sign-in response")
                errors["base"] = "unknown"
            else:
                errors = await self._async_check_session(client)
                if not errors:
                    return await self._async_finish(session, user_id)
        return self.async_show_form(
            step_id="code",
            data_schema=CODE_SCHEMA,
            errors=errors,
            description_placeholders={"email": self._email},
        )

    async def async_step_reauth(
        self, entry_data: Mapping[str, Any]
    ) -> ConfigFlowResult:
        """Sign in again after SiiPet ended the session."""
        return await self._async_sign_in_again(entry_data)

    async def async_step_reconfigure(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Sign in again on request."""
        return await self._async_sign_in_again(self._get_reconfigure_entry().data)

    async def _async_sign_in_again(
        self, entry_data: Mapping[str, Any]
    ) -> ConfigFlowResult:
        """Start the email step with the address and client id of the entry."""
        if any(key not in entry_data for key in SESSION_KEYS):
            return self.async_abort(reason="entry_outdated")
        self._email = entry_data.get(CONF_EMAIL, "")
        # A token entry stores the phone's identifier. An email sign-in uses
        # a new identifier, so that it does not act as the phone.
        if entry_data.get(CONF_AUTH_METHOD, AUTH_EMAIL) != AUTH_TOKEN:
            self._client_id = entry_data[CONF_CLIENT_ID]
        return await self.async_step_email()

    async def _async_request_code(self, email: str) -> dict[str, str]:
        """Request an email code. Return form errors."""
        try:
            await self._client().request_email_code(email)
        except SiiPetConnectionError:
            return {"base": "cannot_connect"}
        except SiiPetApiError as err:
            if err.code == TOO_MANY_REQUESTS:
                return {"base": "too_many_requests"}
            _LOGGER.debug("Code request rejected: %s", err)
            return {"base": "code_request_failed"}
        except SiiPetError:
            _LOGGER.exception("Unexpected code request response")
            return {"base": "unknown"}
        return {}

    async def _async_check_session(self, client: SiiPetClient) -> dict[str, str]:
        """Read the cats once to confirm that SiiPet accepts the new session.

        Return form errors.
        """
        try:
            await client.get_cats()
        except SiiPetAuthError:
            return {"base": "session_rejected"}
        except SiiPetConnectionError:
            return {"base": "cannot_connect"}
        except SiiPetError:
            _LOGGER.exception("Unexpected session check response")
            return {"base": "unknown"}
        return {}

    async def _async_finish(self, session: Session, user_id: str) -> ConfigFlowResult:
        """Create the entry, or update it during reauth or reconfigure."""
        await self.async_set_unique_id(user_id)
        data = {
            CONF_AUTH_METHOD: AUTH_EMAIL,
            CONF_EMAIL: self._email,
            CONF_TOKEN: session.token,
            CONF_EXPIRE_AT: session.expire_at,
            CONF_CLIENT_ID: self._client_id,
        }
        if self.source == SOURCE_REAUTH:
            entry = self._get_reauth_entry()
        elif self.source == SOURCE_RECONFIGURE:
            entry = self._get_reconfigure_entry()
        else:
            self._abort_if_unique_id_configured()
            return self.async_create_entry(title="SiiPet", data=data)
        self._abort_if_unique_id_mismatch(reason="wrong_account")
        return self.async_update_reload_and_abort(entry, data_updates=data)

    def _client(self) -> SiiPetClient:
        return SiiPetClient(
            async_get_clientsession(self.hass),
            client_id=self._client_id,
            time_zone=str(self.hass.config.time_zone),
        )


class SiiPetOptionsFlow(OptionsFlowWithReload):
    """Set how many days of media Home Assistant keeps."""

    async def async_step_init(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Show and store the number of days."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)
        return self.async_show_form(
            step_id="init",
            data_schema=self.add_suggested_values_to_schema(
                OPTIONS_SCHEMA, self.config_entry.options
            ),
        )
