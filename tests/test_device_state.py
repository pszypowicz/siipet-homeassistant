"""Tests for the device state coordinator and its link."""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.siipet.const import DOMAIN

from .common import DEVICE_STATE, SHADOWS, FakeShadowLink, setup_integration


async def _push(hass: HomeAssistant, link: FakeShadowLink, sn: str = "SN0001") -> None:
    link.on_state(sn, DEVICE_STATE)
    await hass.async_block_till_done()


async def _tick(
    hass: HomeAssistant, freezer: FrozenDateTimeFactory, delta: timedelta
) -> None:
    freezer.tick(delta)
    async_fire_time_changed(hass)
    await hass.async_block_till_done()


async def test_link_starts_after_setup(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """Setup starts one link with the shadows of each camera."""
    await setup_integration(hass, config_entry)
    [link] = shadow_links
    assert link.running
    assert link.cameras == {"SN0001": SHADOWS, "SN0002": SHADOWS}
    assert link.label("SN0002") == "Hallway"
    assert link.label("SN0099") == "a removed camera"
    assert link.fetch_credentials == mock_client.get_iot_credentials
    assert config_entry.runtime_data.device_state.data == {}


async def test_state_is_stored(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A state from the link is stored by serial number."""
    await setup_integration(hass, config_entry)
    await _push(hass, shadow_links[0])
    device_state = config_entry.runtime_data.device_state
    assert device_state.data == {"SN0001": DEVICE_STATE}
    assert device_state.last_update_success


async def test_state_of_unknown_camera_is_ignored(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A state for a camera that is not in the list is dropped."""
    await setup_integration(hass, config_entry)
    await _push(hass, shadow_links[0], "SN0099")
    assert config_entry.runtime_data.device_state.data == {}


async def test_firmware_goes_to_the_device(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """The firmware version becomes the software version of the camera device."""
    await setup_integration(hass, config_entry)
    await _push(hass, shadow_links[0])
    registry = dr.async_get(hass)
    identifier = (DOMAIN, "SN0001")
    device = registry.async_get_device_by_identifier(identifier, config_entry.entry_id)
    assert device.sw_version == "1.2.3"
    shadow_links[0].on_state("SN0001", replace(DEVICE_STATE, firmware="1.2.4"))
    await hass.async_block_till_done()
    device = registry.async_get_device_by_identifier(identifier, config_entry.entry_id)
    assert device.sw_version == "1.2.4"


async def test_grace_before_failure(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """The coordinator fails only after 15 minutes without a connection."""
    await setup_integration(hass, config_entry)
    link = shadow_links[0]
    device_state = config_entry.runtime_data.device_state
    await _push(hass, link)
    link.on_connection(False)
    await _tick(hass, freezer, timedelta(minutes=14))
    assert device_state.last_update_success
    await _tick(hass, freezer, timedelta(minutes=1, seconds=1))
    assert not device_state.last_update_success
    link.on_connection(True)
    await _push(hass, link)
    assert device_state.last_update_success


async def test_reconnect_stops_the_grace(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A new connection within the grace keeps the coordinator working."""
    await setup_integration(hass, config_entry)
    link = shadow_links[0]
    await _push(hass, link)
    link.on_connection(False)
    link.on_connection(True)
    await _tick(hass, freezer, timedelta(minutes=16))
    assert config_entry.runtime_data.device_state.last_update_success


async def test_camera_list_change(
    hass: HomeAssistant,
    freezer: FrozenDateTimeFactory,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A camera sync that drops a camera updates the link and drops its state."""
    await setup_integration(hass, config_entry)
    link = shadow_links[0]
    await _push(hass, link, "SN0002")
    cameras = dict(mock_client.get_cameras.return_value)
    del cameras["SN0002"]
    mock_client.get_cameras.return_value = cameras
    await _tick(hass, freezer, timedelta(hours=1))
    assert link.cameras == {"SN0001": SHADOWS}
    assert "SN0002" not in config_entry.runtime_data.device_state.data


async def test_unload_stops_the_link(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """Unload stops the link and the grace timer."""
    await setup_integration(hass, config_entry)
    shadow_links[0].on_connection(False)
    assert await hass.config_entries.async_unload(config_entry.entry_id)
    assert config_entry.state is ConfigEntryState.NOT_LOADED
    assert shadow_links[0].stopped
