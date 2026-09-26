"""Config flow for the SiiPet integration."""

from __future__ import annotations

from collections.abc import Mapping
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
)
from .api.client import TOO_MANY_REQUESTS, WRONG_CODE
from .const import CONF_CLIENT_ID, CONF_CODE, CONF_EXPIRE_AT, CONF_TOKEN, DOMAIN

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


class SiiPetConfigFlow(ConfigFlow, domain=DOMAIN):
    """Sign in to a SiiPet account with an emailed code."""

    VERSION = 1

    def __init__(self) -> None:
        """Start a flow with a new client identifier."""
        self._email = ""
        self._client_id = str(uuid.uuid4())

    async def async_step_user(
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
            step_id="user", data_schema=EMAIL_SCHEMA, errors=errors
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
        """Start reauth with the stored email and client identifier."""
        self._email = entry_data[CONF_EMAIL]
        self._client_id = entry_data[CONF_CLIENT_ID]
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Confirm reauth and request a new code."""
        errors: dict[str, str] = {}
        if user_input is not None:
            errors = await self._async_request_code(self._email)
            if not errors:
                return await self.async_step_code()
        return self.async_show_form(
            step_id="reauth_confirm",
            errors=errors,
            description_placeholders={"email": self._email},
        )

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
        """Read the cats once to confirm the new session survives. Return form errors."""
        try:
            await client.get_cats()
        except SiiPetAuthError:
            return {"base": "session_in_use"}
        except SiiPetConnectionError:
            return {"base": "cannot_connect"}
        except SiiPetError:
            _LOGGER.exception("Unexpected session check response")
            return {"base": "unknown"}
        return {}

    async def _async_finish(self, session: Session, user_id: str) -> ConfigFlowResult:
        """Create the entry, or update it during reauth."""
        await self.async_set_unique_id(user_id)
        data = {
            CONF_EMAIL: self._email,
            CONF_TOKEN: session.token,
            CONF_EXPIRE_AT: session.expire_at,
            CONF_CLIENT_ID: self._client_id,
        }
        if self.source == SOURCE_REAUTH:
            self._abort_if_unique_id_mismatch(reason="wrong_account")
            return self.async_update_reload_and_abort(
                self._get_reauth_entry(), data_updates=data
            )
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title="SiiPet", data=data)

    def _client(self) -> SiiPetClient:
        return SiiPetClient(
            async_get_clientsession(self.hass),
            client_id=self._client_id,
            time_zone=str(self.hass.config.time_zone),
        )
