"""Tests for the camera setting switches."""

from __future__ import annotations

from dataclasses import replace
from unittest.mock import ANY, AsyncMock

from homeassistant.const import STATE_OFF, STATE_ON, STATE_UNKNOWN, EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers import entity_registry as er
import pytest
from pytest_homeassistant.common import MockConfigEntry

from .common import DEVICE_STATE, FakeShadowLink, camera_reports, setup_integration

AUTO = "switch.bathroom_auto_fill_light"
NIGHT = "switch.bathroom_night_vision_fill_light"
PRIVACY = "switch.bathroom_privacy_mode"
FIRMWARE = "switch.bathroom_automatic_firmware_updates"


async def _setup(
    hass: HomeAssistant, config_entry: MockConfigEntry, links: list[FakeShadowLink]
) -> FakeShadowLink:
    await setup_integration(hass, config_entry)
    links[0].on_connection(True)
    links[0].on_state("SN0001", DEVICE_STATE)
    await hass.async_block_till_done()
    return links[0]


async def _switch(hass: HomeAssistant, entity_id: str, on: bool) -> None:
    await hass.services.async_call(
        "switch",
        "turn_on" if on else "turn_off",
        {"entity_id": entity_id},
        blocking=True,
    )


async def test_switches_show_reported_values(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    entity_registry: er.EntityRegistry,
) -> None:
    """The switches show the reported fields. Privacy is a main control."""
    await _setup(hass, config_entry, shadow_links)
    assert hass.states.get(AUTO).state == STATE_ON
    assert hass.states.get(NIGHT).state == STATE_ON
    assert hass.states.get(PRIVACY).state == STATE_OFF
    assert entity_registry.async_get(AUTO).entity_category is EntityCategory.CONFIG
    assert entity_registry.async_get(NIGHT).entity_category is EntityCategory.CONFIG
    assert entity_registry.async_get(PRIVACY).entity_category is None


@pytest.mark.parametrize(
    ("entity_id", "on", "command", "payload", "reported"),
    [
        (
            AUTO,
            False,
            "config.fillLight",
            {"level": 2, "brightness2": 70, "autoLight": False, "lowLight": True},
            {"fill_light_auto": False},
        ),
        (
            NIGHT,
            False,
            "config.fillLight",
            {"level": 2, "brightness2": 70, "autoLight": True, "lowLight": False},
            {"fill_light_night_vision": False},
        ),
        (PRIVACY, True, "config.privacyMode", {"active": True}, {"privacy": True}),
    ],
)
async def test_switch_changes(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    mock_control: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    entity_id: str,
    on: bool,
    command: str,
    payload: dict[str, object],
    reported: dict[str, object],
) -> None:
    """Each switch sends its command and shows the reported value."""
    link = await _setup(hass, config_entry, shadow_links)
    mock_control.send.side_effect = camera_reports(link, **reported)
    await _switch(hass, entity_id, on)
    mock_control.send.assert_awaited_once_with(
        "SN0001", command, payload, limit=ANY, still_wanted=ANY
    )
    assert hass.states.get(entity_id).state == (STATE_ON if on else STATE_OFF)


@pytest.mark.parametrize(
    ("mode", "state"),
    [(0, STATE_ON), (1, STATE_OFF), (2, STATE_UNKNOWN), (None, STATE_UNKNOWN)],
)
async def test_firmware_switch_state(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    entity_registry: er.EntityRegistry,
    mode: int | None,
    state: str,
) -> None:
    """The switch is on in automatic mode, off in manual mode, and unknown otherwise."""
    link = await _setup(hass, config_entry, shadow_links)
    link.on_state("SN0001", replace(DEVICE_STATE, update_mode=mode))
    await hass.async_block_till_done()
    assert hass.states.get(FIRMWARE).state == state
    assert entity_registry.async_get(FIRMWARE).entity_category is EntityCategory.CONFIG


@pytest.mark.parametrize(("start", "on", "mode"), [(0, False, 1), (2, True, 0)])
async def test_firmware_switch_changes(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    mock_control: AsyncMock,
    config_entry: MockConfigEntry,
    shadow_links: list[FakeShadowLink],
    start: int,
    on: bool,
    mode: int,
) -> None:
    """The switch writes the mode, wakes the camera, and shows the reported mode."""
    link = await _setup(hass, config_entry, shadow_links)
    link.on_state("SN0001", replace(DEVICE_STATE, update_mode=start))
    await hass.async_block_till_done()
    mock_control.send.side_effect = camera_reports(link, update_mode=mode)
    await _switch(hass, FIRMWARE, on)
    link.update_desired.assert_awaited_once_with(
        "SN0001", "otaMode", {"mode": mode}, limit=ANY
    )
    mock_control.send.assert_awaited_once_with(
        "SN0001", "wakeup.lowpower", {}, limit=ANY, still_wanted=ANY
    )
    assert hass.states.get(FIRMWARE).state == (STATE_ON if on else STATE_OFF)
