"""Tests for the firmware update entities."""

from __future__ import annotations

from dataclasses import replace
from unittest.mock import AsyncMock

from homeassistant.components.update import UpdateEntityFeature
from homeassistant.const import (
    STATE_OFF,
    STATE_ON,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
    EntityCategory,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
import pytest
from pytest_homeassistant.common import MockConfigEntry
from pytest_homeassistant.typing import WebSocketGenerator

from custom_components.siipet.api import (
    FirmwareRelease,
    SiiPetConnectionError,
    SystemConfig,
)

from .common import DEVICE_STATE, FakeShadowLink, setup_integration

ENTITY = "update.bathroom_firmware"


async def _setup(
    hass: HomeAssistant, config_entry: MockConfigEntry, links: list[FakeShadowLink]
) -> FakeShadowLink:
    await setup_integration(hass, config_entry)
    links[0].on_connection(True)
    links[0].on_state("SN0001", DEVICE_STATE)
    await hass.async_block_till_done()
    return links[0]


def _latest(version: str) -> SystemConfig:
    return SystemConfig(firmware={"JOY1": FirmwareRelease(version, "LitterLens")})


async def test_firmware_up_to_date(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    entity_registry: er.EntityRegistry,
) -> None:
    """The camera runs the latest firmware, so the entity is off."""
    await _setup(hass, config_entry, shadow_links)
    state = hass.states.get(ENTITY)
    assert state.state == STATE_OFF
    assert state.attributes["installed_version"] == "1.2.3"
    assert state.attributes["latest_version"] == "1.2.3"
    assert state.attributes["title"] == "LitterLens"
    assert state.attributes["auto_update"] is True
    assert state.attributes["supported_features"] == UpdateEntityFeature.RELEASE_NOTES
    entry = entity_registry.async_get(ENTITY)
    assert entry.entity_category is EntityCategory.DIAGNOSTIC
    assert entry.unique_id == "SN0001_firmware"


@pytest.mark.parametrize(
    ("latest", "state"), [("1.2.10", STATE_ON), ("1.2.2", STATE_OFF)]
)
async def test_firmware_versions(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    latest: str,
    state: str,
) -> None:
    """A newer latest version turns the entity on, and an older one leaves it off."""
    mock_client.get_system_config.return_value = _latest(latest)
    await _setup(hass, config_entry, shadow_links)
    assert hass.states.get(ENTITY).state == state


async def test_firmware_unknown_without_a_release(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """Without a config, or without an entry for the product, the state is unknown."""
    mock_client.get_system_config.return_value = SystemConfig()
    await _setup(hass, config_entry, shadow_links)
    assert hass.states.get(ENTITY).state == STATE_UNKNOWN


async def test_firmware_unknown_without_a_config(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A failed config read leaves the latest version unknown."""
    mock_client.get_system_config.side_effect = SiiPetConnectionError("down")
    await _setup(hass, config_entry, shadow_links)
    assert hass.states.get(ENTITY).state == STATE_UNKNOWN


async def test_firmware_unknown_without_a_product_id(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A camera without a product id has no latest version."""
    cameras = mock_client.get_cameras.return_value
    mock_client.get_cameras.return_value = {
        **cameras,
        "SN0001": replace(cameras["SN0001"], product_id=""),
    }
    await _setup(hass, config_entry, shadow_links)
    assert hass.states.get(ENTITY).state == STATE_UNKNOWN


@pytest.mark.parametrize(
    ("mode", "auto"), [(0, True), (1, False), (2, False), (None, False)]
)
async def test_firmware_auto_update(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    mode: int | None,
    auto: bool,
) -> None:
    """Only the automatic mode counts as auto update."""
    link = await _setup(hass, config_entry, shadow_links)
    link.on_state("SN0001", replace(DEVICE_STATE, update_mode=mode))
    await hass.async_block_till_done()
    assert hass.states.get(ENTITY).attributes["auto_update"] is auto


async def _release_notes(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator
) -> object:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(
        {"type": "update/release_notes", "entity_id": ENTITY}
    )
    result = await client.receive_json()
    assert result["success"]
    return result["result"]


async def test_firmware_release_notes(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """The release notes are markdown: a bold title per section and one bullet per line."""
    await _setup(hass, config_entry, shadow_links)
    assert await _release_notes(hass, hass_ws_client) == (
        "**Smarter detection**\n- Better cat recognition.\n\n"
        "**Fixes**\n- Fewer missed visits.\n- Faster start."
    )


async def test_firmware_without_release_notes(
    hass: HomeAssistant,
    hass_ws_client: WebSocketGenerator,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A release without notes gives no notes."""
    mock_client.get_system_config.return_value = _latest("1.2.3")
    await _setup(hass, config_entry, shadow_links)
    assert await _release_notes(hass, hass_ws_client) is None


async def test_firmware_entity_waits_for_the_first_state(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """The entity comes with the camera's first shadow state."""
    await setup_integration(hass, config_entry)
    shadow_links[0].on_connection(True)
    await hass.async_block_till_done()
    assert hass.states.get(ENTITY) is None
    shadow_links[0].on_state("SN0001", DEVICE_STATE)
    await hass.async_block_till_done()
    assert hass.states.get(ENTITY).state == STATE_OFF


async def test_firmware_unavailable_when_the_camera_leaves(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
) -> None:
    """A camera that leaves the camera list makes the entity unavailable."""
    await _setup(hass, config_entry, shadow_links)
    coordinator = config_entry.runtime_data.coordinator
    cameras = {
        sn: camera for sn, camera in coordinator.data.cameras.items() if sn != "SN0001"
    }
    coordinator.async_set_updated_data(replace(coordinator.data, cameras=cameras))
    await hass.async_block_till_done()
    assert hass.states.get(ENTITY).state == STATE_UNAVAILABLE
