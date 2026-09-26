"""Tests for the SiiPet diagnostics."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.diagnostics import async_get_config_entry_diagnostics

from .common import load_data, setup_integration


async def test_diagnostics(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Diagnostics summarize the account and contain no private values."""
    await setup_integration(hass, config_entry)
    result = await async_get_config_entry_diagnostics(hass, config_entry)

    assert result["last_update_success"] is True
    assert result["last_update"] == "2026-09-26T12:00:00+00:00"
    assert result["cats"] == 2
    assert result["cameras"][0] == {
        "product_id": "JOY1",
        "role": 1,
        "connected": True,
        "subscribed": True,
    }
    assert result["visits_per_day"]["2026-09-26"] == 6
    assert result["unassigned_visits"] == 1
    assert result["abnormal_labels"] == {"shape": 2, "color": 1, "event": 1}

    text = json.dumps(result, default=str)
    for private in (
        load_data("login.json")["Token"],
        "cat@example.com",
        "client-uuid-0001",
        "user-0001",
        "SN0001",
        "pet-luna",
        "group-0001",
        "ev-1",
    ):
        assert private not in text
