"""Config flow for the SiiPet integration."""

from __future__ import annotations

from collections.abc import Callable, Mapping
import logging
from typing import Any
import uuid

from homeassistant.config_entries import SOURCE_REAUTH, ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_EMAIL
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.selector import (
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
    session_from_token,
)
from .api.client import TOO_MANY_REQUESTS, WRONG_CODE
from .const import (
    AUTH_EMAIL,
    AUTH_TOKEN,
    CONF_AUTH_METHOD,
    CONF_CLIENT_ID,
    CONF_CODE,
    CONF_DEVICE_IDENTIFIER,
    CONF_EXPIRE_AT,
    CONF_TOKEN,
    DOMAIN,
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
TOKEN_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_TOKEN): TextSelector(
            TextSelectorConfig(type=TextSelectorType.PASSWORD)
        ),
        vol.Required(CONF_DEVICE_IDENTIFIER): TextSelector(),
    }
)
SIGN_IN_METHODS = ["email", "token"]


def _clean_token(value: str) -> str:
    """Remove white space and a `Bearer` prefix from a pasted token."""
    parts = value.split(None, 1)
    if len(parts) == 2 and parts[0].lower() == "bearer":
        return parts[1].strip()
    return value.strip()


class SiiPetConfigFlow(ConfigFlow, domain=DOMAIN):
    """Sign in to a SiiPet account with an emailed code or a pasted token."""

    VERSION = 1

    def __init__(self) -> None:
        """Start a flow with a new client identifier."""
        self._email = ""
        self._client_id = str(uuid.uuid4())
        self._device_identifier = ""
        # Sessions that renewed during a token check, by pasted token, so that
        # a retry after a failed read keeps the renewal.
        self._renewed: dict[str, Session] = {}

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Choose how to sign in."""
        return self.async_show_menu(step_id="user", menu_options=SIGN_IN_METHODS)

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
            client = self._client(self._client_id)
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
                errors = await self._async_check_session(client, "session_rejected")
                if not errors:
                    return await self._async_finish(
                        session, user_id, AUTH_EMAIL, self._client_id
                    )
        return self.async_show_form(
            step_id="code",
            data_schema=CODE_SCHEMA,
            errors=errors,
            description_placeholders={"email": self._email},
        )

    async def async_step_token(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for an access token and the device identifier that it belongs to."""
        errors: dict[str, str] = {}
        if user_input is not None:
            self._device_identifier = user_input[CONF_DEVICE_IDENTIFIER].strip()
            if not self._device_identifier:
                errors[CONF_DEVICE_IDENTIFIER] = "invalid_device_identifier"
            token = _clean_token(user_input[CONF_TOKEN])
            try:
                session = self._renewed.get(token) or session_from_token(token)
                user_id = session.user_id
            except SiiPetError:
                errors[CONF_TOKEN] = "invalid_token"
            if not errors:

                def _keep_renewed(renewed: Session) -> None:
                    self._renewed[token] = renewed

                client = self._client(
                    self._device_identifier,
                    session=session,
                    on_session_update=_keep_renewed,
                )
                errors = await self._async_check_session(client, "token_rejected")
                if not errors:
                    return await self._async_finish(
                        self._renewed.get(token, session),
                        user_id,
                        AUTH_TOKEN,
                        self._device_identifier,
                    )
        return self.async_show_form(
            step_id="token",
            data_schema=self.add_suggested_values_to_schema(
                TOKEN_SCHEMA, {CONF_DEVICE_IDENTIFIER: self._device_identifier}
            ),
            errors=errors,
        )

    async def async_step_reauth(
        self, entry_data: Mapping[str, Any]
    ) -> ConfigFlowResult:
        """Offer both sign-in methods again."""
        self._email = entry_data.get(CONF_EMAIL, "")
        if entry_data.get(CONF_AUTH_METHOD, AUTH_EMAIL) == AUTH_TOKEN:
            # A token entry stores the phone's identifier. An email sign-in
            # uses a new identifier, so that it does not act as the phone.
            self._device_identifier = entry_data[CONF_CLIENT_ID]
        else:
            self._client_id = entry_data[CONF_CLIENT_ID]
        return self.async_show_menu(step_id="reauth", menu_options=SIGN_IN_METHODS)

    async def _async_request_code(self, email: str) -> dict[str, str]:
        """Request an email code. Return form errors."""
        try:
            await self._client(self._client_id).request_email_code(email)
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

    async def _async_check_session(
        self, client: SiiPetClient, auth_error: str
    ) -> dict[str, str]:
        """Read the cats once to confirm that SiiPet accepts the new session.

        Return form errors. A rejected session gives `auth_error`.
        """
        try:
            await client.get_cats()
        except SiiPetAuthError:
            return {"base": auth_error}
        except SiiPetConnectionError:
            return {"base": "cannot_connect"}
        except SiiPetError:
            _LOGGER.exception("Unexpected session check response")
            return {"base": "unknown"}
        return {}

    async def _async_finish(
        self, session: Session, user_id: str, method: str, client_id: str
    ) -> ConfigFlowResult:
        """Create the entry, or update it during reauth."""
        await self.async_set_unique_id(user_id)
        data: dict[str, Any] = {
            CONF_AUTH_METHOD: method,
            CONF_TOKEN: session.token,
            CONF_EXPIRE_AT: session.expire_at,
            CONF_CLIENT_ID: client_id,
        }
        if method == AUTH_EMAIL:
            data[CONF_EMAIL] = self._email
        if self.source == SOURCE_REAUTH:
            self._abort_if_unique_id_mismatch(reason="wrong_account")
            return self.async_update_reload_and_abort(
                self._get_reauth_entry(), data_updates=data
            )
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title="SiiPet", data=data)

    def _client(
        self,
        client_id: str,
        *,
        session: Session | None = None,
        on_session_update: Callable[[Session], None] | None = None,
    ) -> SiiPetClient:
        return SiiPetClient(
            async_get_clientsession(self.hass),
            client_id=client_id,
            time_zone=str(self.hass.config.time_zone),
            session=session,
            on_session_update=on_session_update,
        )
