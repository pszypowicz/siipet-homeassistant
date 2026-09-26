"""Tests for the SiiPet binary sensors."""

from __future__ import annotations

from unittest.mock import AsyncMock

from homeassistant.const import STATE_OFF, STATE_ON
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from .common import setup_integration


async def test_camera_connected(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Each camera reports its connection status."""
    await setup_integration(hass, config_entry)
    bathroom = hass.states.get("binary_sensor.bathroom_connected")
    assert bathroom.state == STATE_ON
    assert bathroom.attributes["device_class"] == "connectivity"
    assert hass.states.get("binary_sensor.hallway_connected").state == STATE_OFF
