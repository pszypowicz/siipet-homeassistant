"""Tests for the SiiPet actions."""

from __future__ import annotations

from datetime import timedelta
import json
from typing import Any
from unittest.mock import AsyncMock

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import device_registry as dr
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
import voluptuous as vol

from custom_components.siipet.api import SiiPetConnectionError
from custom_components.siipet.const import DOMAIN

from .common import TODAY, setup_integration


def _device_id(hass: HomeAssistant, entry: MockConfigEntry, identifier: str) -> str:
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, identifier), entry.entry_id
    )
    assert device is not None
    return device.id


async def _list(hass: HomeAssistant, **data: Any) -> dict[str, Any]:
    return await hass.services.async_call(
        DOMAIN, "list_visits", data, blocking=True, return_response=True
    )


async def test_list_visits_today(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Today's visits come newest first, with the cats of the account."""
    await setup_integration(hass, config_entry)
    luna = _device_id(hass, config_entry, "pet-luna")
    response = await _list(hass)
    assert response["cats"] == [
        {"device_id": luna, "name": "Luna", "unknown": False},
        {
            "device_id": _device_id(hass, config_entry, "pet-milo"),
            "name": "Milo",
            "unknown": False,
        },
        {
            "device_id": _device_id(hass, config_entry, "unknown"),
            "name": "Unknown cat",
            "unknown": True,
        },
    ]
    visits = response["visits"]
    assert [visit["event_id"] for visit in visits] == [
        "ev-6",
        "ev-5",
        "ev-4",
        "ev-1",
        "ev-2",
        "ev-3",
    ]
    assert visits[0] == {
        "event_id": "ev-6",
        "start": "2026-09-26T09:00:00+00:00",
        "duration": 200,
        "type": "pee",
        "cats": [{"device_id": luna, "name": "Luna"}],
        "camera": "Bathroom",
        "note": "Long visit",
        "abnormal": True,
        "abnormal_reasons": ["Potty Overtime"],
        "has_video": True,
        "has_stool_image": False,
    }
    assert visits[2]["cats"] == []


@pytest.mark.parametrize(
    ("identifier", "event_ids"),
    [("pet-milo", ["ev-5", "ev-2"]), ("unknown", ["ev-4"])],
)
async def test_list_visits_for_one_cat(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    identifier: str,
    event_ids: list[str],
) -> None:
    """A cat device, or the Unknown cat device, filters the visits."""
    await setup_integration(hass, config_entry)
    response = await _list(hass, cat=_device_id(hass, config_entry, identifier))
    assert [visit["event_id"] for visit in response["visits"]] == event_ids


async def test_list_visits_window_days_make_no_call(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Days in the 7-day window come from the coordinator."""
    await setup_integration(hass, config_entry)
    calls = mock_client.get_day.await_count
    response = await _list(hass, days=7)
    assert len(response["visits"]) == 6
    assert mock_client.get_day.await_count == calls


async def test_list_visits_older_day(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A day before the window is read from the API."""
    await setup_integration(hass, config_entry)
    day = TODAY - timedelta(days=20)
    response = await _list(hass, date=day.isoformat())
    assert response["visits"] == []
    assert mock_client.get_day.await_args_list[-1].args[0] == day


async def test_list_visits_older_day_failure(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A failed read of an older day raises a translated error."""
    await setup_integration(hass, config_entry)
    mock_client.get_day.side_effect = SiiPetConnectionError("down")
    with pytest.raises(HomeAssistantError) as info:
        await _list(hass, date=(TODAY - timedelta(days=20)).isoformat())
    assert info.value.translation_key == "request_failed"


@pytest.mark.parametrize("offset", [31, -1])
async def test_list_visits_date_out_of_range(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    offset: int,
) -> None:
    """A date before the 31-day history or after today is refused."""
    await setup_integration(hass, config_entry)
    with pytest.raises(ServiceValidationError) as info:
        await _list(hass, date=(TODAY - timedelta(days=offset)).isoformat())
    assert info.value.translation_key == "date_out_of_range"


@pytest.mark.parametrize("days", [0, 8])
async def test_list_visits_days_out_of_range(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    days: int,
) -> None:
    """The schema refuses days outside 1 to 7."""
    await setup_integration(hass, config_entry)
    with pytest.raises(vol.Invalid):
        await _list(hass, days=days)


async def test_list_visits_invalid_cat(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A device that is not a SiiPet cat is refused."""
    await setup_integration(hass, config_entry)
    for device_id in (_device_id(hass, config_entry, "SN0001"), "not-a-device"):
        with pytest.raises(ServiceValidationError) as info:
            await _list(hass, cat=device_id)
        assert info.value.translation_key == "invalid_cat"


async def test_list_visits_has_no_private_values(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """The response holds no pet id, serial number, or URL."""
    await setup_integration(hass, config_entry)
    text = json.dumps(await _list(hass, days=7))
    for private in ("pet-luna", "pet-milo", "SN0001", "amazonaws", "events/"):
        assert private not in text


async def test_list_visits_not_loaded(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Without a loaded entry, the action is refused."""
    mock_client.get_day.side_effect = SiiPetConnectionError("down")
    await hass.config_entries.async_setup(config_entry.entry_id)
    await hass.async_block_till_done()
    with pytest.raises(ServiceValidationError) as info:
        await _list(hass)
    assert info.value.translation_key == "not_loaded"
