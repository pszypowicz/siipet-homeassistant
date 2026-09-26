"""Tests for the SiiPet config flow."""

from __future__ import annotations

from collections.abc import Generator
from unittest.mock import AsyncMock, patch
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
    CONF_CLIENT_ID,
    CONF_CODE,
    CONF_EXPIRE_AT,
    CONF_TOKEN,
    DOMAIN,
)

from .common import load_data, make_token

LOGIN = load_data("login.json")


@pytest.fixture(autouse=True)
def skip_setup() -> Generator[None]:
    """Do not set up the entry that a flow creates."""
    with patch("custom_components.siipet.async_setup_entry", return_value=True):
        yield


async def _start(hass: HomeAssistant) -> str:
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"
    return result["flow_id"]


async def test_user_flow(hass: HomeAssistant, mock_client: AsyncMock) -> None:
    """Email and code create an entry for the account."""
    flow_id = await _start(hass)
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
    assert data[CONF_EMAIL] == "cat@example.com"
    assert data[CONF_TOKEN] == LOGIN["Token"]
    assert data[CONF_EXPIRE_AT] == LOGIN["ExpireAt"]
    assert uuid.UUID(data[CONF_CLIENT_ID])
    mock_client.login.assert_awaited_once_with("cat@example.com", "012345")


async def test_invalid_email(hass: HomeAssistant, mock_client: AsyncMock) -> None:
    """An address without @ shows an error and sends no request."""
    flow_id = await _start(hass)
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "not-an-email"}
    )
    assert result["errors"] == {CONF_EMAIL: "invalid_email"}
    mock_client.request_email_code.assert_not_awaited()


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (SiiPetConnectionError("down"), "cannot_connect"),
        (SiiPetApiError(1001, "rejected"), "code_request_failed"),
        (SiiPetError("odd"), "unknown"),
    ],
)
async def test_code_request_errors(
    hass: HomeAssistant, mock_client: AsyncMock, error: Exception, expected: str
) -> None:
    """A failed code request shows an error, and a retry works."""
    flow_id = await _start(hass)
    mock_client.request_email_code.side_effect = error
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_EMAIL: "cat@example.com"}
    )
    assert result["step_id"] == "user"
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
    flow_id = await _start(hass)
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


async def test_single_instance(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A second entry is not allowed."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"


async def test_reauth(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Reauth keeps the client id and stores the new session."""
    new_token = make_token("user-0001")
    mock_client.login.return_value = Session(new_token, 1_800_000_000_000)
    result = await config_entry.start_reauth_flow(hass)
    assert result["step_id"] == "reauth_confirm"
    assert result["description_placeholders"]["email"] == "cat@example.com"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["step_id"] == "code"
    mock_client.request_email_code.assert_awaited_once_with("cat@example.com")

    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    assert config_entry.data[CONF_TOKEN] == new_token
    assert config_entry.data[CONF_EXPIRE_AT] == 1_800_000_000_000
    assert config_entry.data[CONF_CLIENT_ID] == "client-uuid-0001"


async def test_reauth_code_request_error(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A failed code request during reauth shows an error."""
    mock_client.request_email_code.side_effect = SiiPetConnectionError("down")
    result = await config_entry.start_reauth_flow(hass)
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["step_id"] == "reauth_confirm"
    assert result["errors"] == {"base": "cannot_connect"}


async def test_reauth_wrong_account(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Reauth with another account aborts and keeps the old session."""
    mock_client.login.return_value = Session(make_token("user-9999"), 1_800_000_000_000)
    result = await config_entry.start_reauth_flow(hass)
    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_CODE: "012345"}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "wrong_account"
    assert config_entry.data[CONF_TOKEN] == LOGIN["Token"]
