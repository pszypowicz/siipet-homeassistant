"""Tests for the SiiPet integration setup."""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock

from homeassistant.config_entries import SOURCE_REAUTH, ConfigEntryState
from homeassistant.core import HomeAssistant
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.api import Session, SiiPetAuthError, SiiPetConnectionError
from custom_components.siipet.const import (
    CONF_CLIENT_ID,
    CONF_EXPIRE_AT,
    CONF_TOKEN,
    DOMAIN,
)

from .common import setup_integration


async def test_setup_and_unload(
    hass: HomeAssistant, mock_client_class: MagicMock, config_entry: MockConfigEntry
) -> None:
    """The entry loads with the stored session and unloads."""
    await setup_integration(hass, config_entry)
    assert config_entry.state is ConfigEntryState.LOADED
    assert hass.states.async_entity_ids("binary_sensor") == []
    kwargs = mock_client_class.call_args.kwargs
    assert kwargs["client_id"] == "client-uuid-0001"
    assert kwargs["time_zone"] == "UTC"
    assert kwargs["session"] == Session(
        config_entry.data[CONF_TOKEN], config_entry.data[CONF_EXPIRE_AT]
    )

    assert await hass.config_entries.async_unload(config_entry.entry_id)
    assert config_entry.state is ConfigEntryState.NOT_LOADED


async def test_session_update_is_saved(
    hass: HomeAssistant, mock_client_class: MagicMock, config_entry: MockConfigEntry
) -> None:
    """A renewed session is written to the entry data."""
    await setup_integration(hass, config_entry)
    save = mock_client_class.call_args.kwargs["on_session_update"]
    save(Session("renewed-token", 1_900_000_000_000))
    assert config_entry.data[CONF_TOKEN] == "renewed-token"
    assert config_entry.data[CONF_EXPIRE_AT] == 1_900_000_000_000


async def test_setup_auth_error_starts_reauth(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A rejected session fails setup and starts reauth."""
    mock_client.get_cats.side_effect = SiiPetAuthError("expired")
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.SETUP_ERROR
    flows = hass.config_entries.flow.async_progress_by_handler(DOMAIN)
    assert [flow["context"]["source"] for flow in flows] == [SOURCE_REAUTH]


async def test_setup_connection_error_retries(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A connection error at setup retries later."""
    mock_client.get_day.side_effect = SiiPetConnectionError("down")
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.SETUP_RETRY


async def test_entry_without_session(
    hass: HomeAssistant, mock_client: AsyncMock
) -> None:
    """An entry from version 0.0.1 has no session and fails setup."""
    entry = MockConfigEntry(domain=DOMAIN, title="SiiPet", unique_id=DOMAIN, data={})
    entry.add_to_hass(hass)
    await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
    assert entry.state is ConfigEntryState.SETUP_ERROR
    assert hass.config_entries.flow.async_progress_by_handler(DOMAIN) == []


async def test_token_entry_setup(
    hass: HomeAssistant, mock_client_class: MagicMock, token_entry: MockConfigEntry
) -> None:
    """An entry from a pasted token loads with the phone's device identifier."""
    await setup_integration(hass, token_entry)
    assert token_entry.state is ConfigEntryState.LOADED
    kwargs = mock_client_class.call_args.kwargs
    assert kwargs["client_id"] == "phone-device-0001"
    assert kwargs["session"] == Session(
        token_entry.data[CONF_TOKEN], token_entry.data[CONF_EXPIRE_AT]
    )
    assert kwargs["on_session_update"] is not None


@pytest.mark.parametrize("key", [CONF_TOKEN, CONF_EXPIRE_AT, CONF_CLIENT_ID])
async def test_entry_missing_key(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    caplog: pytest.LogCaptureFixture,
    key: str,
) -> None:
    """An entry without a session key fails setup cleanly and starts no reauth."""
    hass.config_entries.async_update_entry(
        config_entry, data={k: v for k, v in config_entry.data.items() if k != key}
    )
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    assert config_entry.state is ConfigEntryState.SETUP_ERROR
    assert "Remove the SiiPet entry and add it again" in caplog.text
    assert "KeyError" not in caplog.text
    assert hass.config_entries.flow.async_progress_by_handler(DOMAIN) == []
