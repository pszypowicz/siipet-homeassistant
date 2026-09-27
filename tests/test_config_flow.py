"""Tests for the SiiPet config flow."""

from __future__ import annotations

from collections.abc import Generator
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch
import uuid

from homeassistant.config_entries import SOURCE_USER
from homeassistant.const import CONF_EMAIL
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.api import (
    Session,
    SiiPetApiError,
    SiiPetAuthError,
    SiiPetConnectionError,
    SiiPetError,
)
from custom_components.siipet.const import (
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

from .common import load_data, make_token

LOGIN = load_data("login.json")
NEW_TOKEN = make_token("user-0001", exp=1_795_000_000)
# The exp claim of NEW_TOKEN minus 15 days, in milliseconds.
NEW_TOKEN_EXPIRE_AT = 1_793_704_000_000
PHONE_DEVICE = "phone-device-0001"


@pytest.fixture(autouse=True)
def skip_setup() -> Generator[None]:
    """Do not set up the entry that a flow creates."""
    with patch("custom_components.siipet.async_setup_entry", return_value=True):
        yield


def _suggested(result: dict[str, Any], field: str) -> Any:
    """Return the suggested value of a form field, or None."""
    for key in result["data_schema"].schema:
        if key == field:
            return (key.description or {}).get("suggested_value")
    raise AssertionError(f"{field} is not in the form")


async def _start(hass: HomeAssistant, method: str) -> str:
    """Start a user flow and pick a sign-in method from the menu."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "user"
    assert result["menu_options"] == ["email", "token"]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": method}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == method
    return result["flow_id"]


async def _start_reauth(
    hass: HomeAssistant, entry: MockConfigEntry, method: str
) -> dict[str, Any]:
    """Start reauth and pick a sign-in method from the menu."""
    result = await entry.start_reauth_flow(hass)
    assert result["type"] is FlowResultType.MENU
    assert result["step_id"] == "reauth"
    assert result["menu_options"] == ["email", "token"]
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {"next_step_id": method}
    )
    assert result["step_id"] == method
    return result


async def test_user_flow(hass: HomeAssistant, mock_client: AsyncMock) -> None:
    """Email and code create an entry for the account."""
    flow_id = await _start(hass, "email")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: " cat@example.com "}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "code"
    assert result["description_placeholders"] == {"email": "cat@example.com"}
    mock_client.request_email_code.assert_awaited_once_with("cat@example.com")

    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_CODE: " 012345 "}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "SiiPet"
    assert result["result"].unique_id == "user-0001"
    data = result["data"]
    assert data[CONF_AUTH_METHOD] == AUTH_EMAIL
    assert data[CONF_EMAIL] == "cat@example.com"
    assert data[CONF_TOKEN] == LOGIN["Token"]
    assert data[CONF_EXPIRE_AT] == LOGIN["ExpireAt"]
    assert uuid.UUID(data[CONF_CLIENT_ID])
    mock_client.login.assert_awaited_once_with("cat@example.com", "012345")


async def test_invalid_email(hass: HomeAssistant, mock_client: AsyncMock) -> None:
    """An address without @ shows an error and sends no request."""
    flow_id = await _start(hass, "email")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "not-an-email"}
    )
    assert result["errors"] == {CONF_EMAIL: "invalid_email"}
    assert _suggested(result, CONF_EMAIL) == "not-an-email"
    mock_client.request_email_code.assert_not_awaited()


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (SiiPetConnectionError("down"), "cannot_connect"),
        (SiiPetApiError(1001, "rejected"), "code_request_failed"),
        (SiiPetApiError(10010, "Too many request today"), "too_many_requests"),
        (SiiPetError("odd"), "unknown"),
    ],
)
async def test_code_request_errors(
    hass: HomeAssistant, mock_client: AsyncMock, error: Exception, expected: str
) -> None:
    """A failed code request shows an error, and a retry works."""
    flow_id = await _start(hass, "email")
    mock_client.request_email_code.side_effect = error
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "cat@example.com"}
    )
    assert result["step_id"] == "email"
    assert result["errors"] == {"base": expected}

    mock_client.request_email_code.side_effect = None
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "cat@example.com"}
    )
    assert result["step_id"] == "code"


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (SiiPetApiError(10004, "wrong code"), {CONF_CODE: "invalid_code"}),
        (SiiPetApiError(1002, "too many attempts"), {"base": "login_failed"}),
        (
            SiiPetApiError(10010, "Too many request today"),
            {"base": "too_many_requests"},
        ),
        (SiiPetAuthError("rejected"), {"base": "login_failed"}),
        (SiiPetConnectionError("down"), {"base": "cannot_connect"}),
        (SiiPetError("odd"), {"base": "unknown"}),
    ],
)
async def test_code_errors(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    error: Exception,
    expected: dict[str, str],
) -> None:
    """A failed sign-in shows an error, and a retry works."""
    flow_id = await _start(hass, "email")
    await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "cat@example.com"}
    )
    mock_client.login.side_effect = error
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_CODE: "000000"}
    )
    assert result["step_id"] == "code"
    assert result["errors"] == expected

    mock_client.login.side_effect = None
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_code_session_rejected(
    hass: HomeAssistant, mock_client: AsyncMock
) -> None:
    """A new session that fails its first read shows an error, and a retry works."""
    flow_id = await _start(hass, "email")
    await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "cat@example.com"}
    )
    mock_client.get_cats.side_effect = SiiPetAuthError("-2: token illegal")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_CODE: "012345"}
    )
    assert result["step_id"] == "code"
    assert result["errors"] == {"base": "session_rejected"}

    mock_client.get_cats.side_effect = None
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_code_session_check_connection_error(
    hass: HomeAssistant, mock_client: AsyncMock
) -> None:
    """A connection error during the session check shows cannot_connect."""
    flow_id = await _start(hass, "email")
    await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "cat@example.com"}
    )
    mock_client.get_cats.side_effect = SiiPetConnectionError("down")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_CODE: "012345"}
    )
    assert result["step_id"] == "code"
    assert result["errors"] == {"base": "cannot_connect"}


async def test_token_flow(
    hass: HomeAssistant, mock_client_class: MagicMock, mock_client: AsyncMock
) -> None:
    """A pasted token and device identifier create an entry for the account."""
    flow_id = await _start(hass, "token")
    result = await hass.config_entries.flow.async_configure(
        flow_id,
        {
            CONF_TOKEN: f" Bearer {LOGIN['Token']} ",
            CONF_DEVICE_IDENTIFIER: f" {PHONE_DEVICE} ",
        },
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "SiiPet"
    assert result["result"].unique_id == "user-0001"
    assert result["data"] == {
        CONF_AUTH_METHOD: AUTH_TOKEN,
        CONF_TOKEN: LOGIN["Token"],
        CONF_EXPIRE_AT: LOGIN["ExpireAt"],
        CONF_CLIENT_ID: PHONE_DEVICE,
    }
    kwargs = mock_client_class.call_args.kwargs
    assert kwargs["client_id"] == PHONE_DEVICE
    assert kwargs["session"] == Session(LOGIN["Token"], LOGIN["ExpireAt"])
    mock_client.get_cats.assert_awaited_once()
    mock_client.login.assert_not_awaited()


@pytest.mark.parametrize(
    "pasted",
    [
        f"Bearer\t{LOGIN['Token']}",
        f"bearer\n{LOGIN['Token']}",
        f"  BEARER   {LOGIN['Token']}\n",
    ],
)
async def test_token_bearer_prefix(
    hass: HomeAssistant, mock_client: AsyncMock, pasted: str
) -> None:
    """A Bearer prefix with any spaces or line breaks is removed."""
    flow_id = await _start(hass, "token")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_TOKEN: pasted, CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_TOKEN] == LOGIN["Token"]


async def test_token_blank_device_identifier(
    hass: HomeAssistant, mock_client: AsyncMock
) -> None:
    """A device identifier of only spaces shows an error and sends no request."""
    flow_id = await _start(hass, "token")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_TOKEN: LOGIN["Token"], CONF_DEVICE_IDENTIFIER: "   "}
    )
    assert result["step_id"] == "token"
    assert result["errors"] == {CONF_DEVICE_IDENTIFIER: "invalid_device_identifier"}
    mock_client.get_cats.assert_not_awaited()


@pytest.mark.parametrize(
    "token", ["not-a-jwt", make_token("user-0001"), make_token("", exp=1_795_000_000)]
)
async def test_token_invalid(
    hass: HomeAssistant, mock_client: AsyncMock, token: str
) -> None:
    """A token without UserId or exp shows an error and sends no request."""
    flow_id = await _start(hass, "token")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_TOKEN: token, CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    )
    assert result["step_id"] == "token"
    assert result["errors"] == {CONF_TOKEN: "invalid_token"}
    assert _suggested(result, CONF_DEVICE_IDENTIFIER) == PHONE_DEVICE
    mock_client.get_cats.assert_not_awaited()


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (SiiPetAuthError("-2: token illegal"), "token_rejected"),
        (SiiPetConnectionError("down"), "cannot_connect"),
        (SiiPetError("odd"), "unknown"),
    ],
)
async def test_token_check_errors(
    hass: HomeAssistant, mock_client: AsyncMock, error: Exception, expected: str
) -> None:
    """A token that fails its first read shows an error, and a retry works."""
    flow_id = await _start(hass, "token")
    mock_client.get_cats.side_effect = error
    user_input = {CONF_TOKEN: LOGIN["Token"], CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    result = await hass.config_entries.flow.async_configure(flow_id, user_input)
    assert result["step_id"] == "token"
    assert result["errors"] == {"base": expected}

    mock_client.get_cats.side_effect = None
    result = await hass.config_entries.flow.async_configure(flow_id, user_input)
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_token_renewed_during_check(
    hass: HomeAssistant, mock_client_class: MagicMock, mock_client: AsyncMock
) -> None:
    """A token that renews during the first read stores the renewed session."""
    renewed = Session(NEW_TOKEN, 1_800_000_000_000)

    async def renew_then_read() -> dict[str, Any]:
        mock_client_class.call_args.kwargs["on_session_update"](renewed)
        return {}

    mock_client.get_cats.side_effect = renew_then_read
    flow_id = await _start(hass, "token")
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_TOKEN: LOGIN["Token"], CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    )
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["data"][CONF_TOKEN] == NEW_TOKEN
    assert result["data"][CONF_EXPIRE_AT] == 1_800_000_000_000


async def test_token_renewed_session_survives_retry(
    hass: HomeAssistant, mock_client_class: MagicMock, mock_client: AsyncMock
) -> None:
    """A retry reuses a session that renewed before a failed read."""
    renewed = Session(NEW_TOKEN, 1_800_000_000_000)

    async def renew_then_fail() -> dict[str, Any]:
        mock_client_class.call_args.kwargs["on_session_update"](renewed)
        raise SiiPetConnectionError("down")

    mock_client.get_cats.side_effect = renew_then_fail
    flow_id = await _start(hass, "token")
    user_input = {CONF_TOKEN: LOGIN["Token"], CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    result = await hass.config_entries.flow.async_configure(flow_id, user_input)
    assert result["errors"] == {"base": "cannot_connect"}

    mock_client.get_cats.side_effect = None
    result = await hass.config_entries.flow.async_configure(flow_id, user_input)
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert mock_client_class.call_args.kwargs["session"] == renewed
    assert result["data"][CONF_TOKEN] == NEW_TOKEN


async def test_single_instance(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A second entry is not allowed."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_reauth_email(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Email reauth suggests the stored address and keeps the client id."""
    mock_client.login.return_value = Session(NEW_TOKEN, 1_800_000_000_000)
    result = await _start_reauth(hass, config_entry, "email")
    assert _suggested(result, CONF_EMAIL) == "cat@example.com"

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_EMAIL: "cat@example.com"}
    )
    assert result["step_id"] == "code"
    mock_client.request_email_code.assert_awaited_once_with("cat@example.com")

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert config_entry.data[CONF_TOKEN] == NEW_TOKEN
    assert config_entry.data[CONF_EXPIRE_AT] == 1_800_000_000_000
    assert config_entry.data[CONF_CLIENT_ID] == "client-uuid-0001"
    assert config_entry.data[CONF_AUTH_METHOD] == AUTH_EMAIL


async def test_reauth_code_request_error(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A failed code request during reauth shows an error."""
    mock_client.request_email_code.side_effect = SiiPetConnectionError("down")
    result = await _start_reauth(hass, config_entry, "email")
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_EMAIL: "cat@example.com"}
    )
    assert result["step_id"] == "email"
    assert result["errors"] == {"base": "cannot_connect"}


async def test_reauth_wrong_account(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Reauth with another account aborts and keeps the old session."""
    mock_client.login.return_value = Session(make_token("user-9999"), 1_800_000_000_000)
    result = await _start_reauth(hass, config_entry, "email")
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_EMAIL: "cat@example.com"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "wrong_account"
    assert config_entry.data[CONF_TOKEN] == LOGIN["Token"]


async def test_reauth_email_entry_with_token(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """An email entry can switch to a pasted token and keeps its email."""
    result = await _start_reauth(hass, config_entry, "token")
    assert _suggested(result, CONF_DEVICE_IDENTIFIER) in (None, "")

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_TOKEN: NEW_TOKEN, CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert config_entry.data[CONF_AUTH_METHOD] == AUTH_TOKEN
    assert config_entry.data[CONF_TOKEN] == NEW_TOKEN
    assert config_entry.data[CONF_EXPIRE_AT] == NEW_TOKEN_EXPIRE_AT
    assert config_entry.data[CONF_CLIENT_ID] == PHONE_DEVICE
    assert config_entry.data[CONF_EMAIL] == "cat@example.com"


async def test_reauth_token_entry(
    hass: HomeAssistant, mock_client: AsyncMock, token_entry: MockConfigEntry
) -> None:
    """Token reauth suggests the stored device identifier and stores the new token."""
    result = await _start_reauth(hass, token_entry, "token")
    assert _suggested(result, CONF_DEVICE_IDENTIFIER) == PHONE_DEVICE

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_TOKEN: NEW_TOKEN, CONF_DEVICE_IDENTIFIER: PHONE_DEVICE}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert token_entry.data[CONF_TOKEN] == NEW_TOKEN
    assert token_entry.data[CONF_EXPIRE_AT] == NEW_TOKEN_EXPIRE_AT


async def test_reauth_token_entry_wrong_account(
    hass: HomeAssistant, mock_client: AsyncMock, token_entry: MockConfigEntry
) -> None:
    """A token of another account aborts reauth and keeps the old token."""
    result = await _start_reauth(hass, token_entry, "token")
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"],
        {
            CONF_TOKEN: make_token("user-9999", exp=1_795_000_000),
            CONF_DEVICE_IDENTIFIER: PHONE_DEVICE,
        },
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "wrong_account"
    assert token_entry.data[CONF_TOKEN] == LOGIN["Token"]


async def test_reauth_token_entry_with_email(
    hass: HomeAssistant, mock_client: AsyncMock, token_entry: MockConfigEntry
) -> None:
    """A token entry can switch to email, with a new client id."""
    mock_client.login.return_value = Session(NEW_TOKEN, 1_800_000_000_000)
    result = await _start_reauth(hass, token_entry, "email")
    assert _suggested(result, CONF_EMAIL) in (None, "")

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_EMAIL: "cat@example.com"}
    )
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert token_entry.data[CONF_AUTH_METHOD] == AUTH_EMAIL
    assert token_entry.data[CONF_EMAIL] == "cat@example.com"
    assert token_entry.data[CONF_TOKEN] == NEW_TOKEN
    assert token_entry.data[CONF_CLIENT_ID] != PHONE_DEVICE
    assert uuid.UUID(token_entry.data[CONF_CLIENT_ID])
