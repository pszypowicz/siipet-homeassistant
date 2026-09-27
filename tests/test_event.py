"""Tests for the SiiPet visit event entities."""

from __future__ import annotations

from dataclasses import replace
from datetime import timedelta
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import EVENT_STATE_CHANGED, STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_capture_events,
)

from custom_components.siipet.api import (
    Cat,
    DayVisits,
    SiiPetConnectionError,
    VisitType,
)

from .common import EMPTY_DAY, TODAY, fixture_day, setup_integration


async def _add_visits(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    base = fixture_day()
    template = base.visits[0]
    extra = (
        replace(
            template,
            event_id="ev-7",
            pet_ids=("pet-luna",),
            type=VisitType.POOP,
            start=template.start.replace(hour=10),
        ),
        replace(
            template,
            event_id="ev-8",
            pet_ids=("pet-luna",),
            type=VisitType.PEE,
            start=template.start.replace(hour=11),
        ),
        replace(
            template,
            event_id="ev-9",
            pet_ids=(),
            type=VisitType.LINGERING,
            start=template.start.replace(hour=11, minute=30),
        ),
    )
    day = DayVisits(base.visits + extra, base.summaries, False)
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )
    await config_entry.runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done()


async def test_no_event_at_start(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Visits that exist at setup do not fire events."""
    await setup_integration(hass, config_entry)
    state = hass.states.get("event.luna_visit")
    assert state.state == STATE_UNKNOWN
    assert state.attributes["event_types"] == ["unknown", "lingering", "poop", "pee"]


async def test_new_visits_fire_in_order(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Each new visit of a cat fires once, oldest first."""
    await setup_integration(hass, config_entry)
    changes = async_capture_events(hass, EVENT_STATE_CHANGED)
    await _add_visits(hass, mock_client, config_entry)

    luna = [
        change.data["new_state"].attributes
        for change in changes
        if change.data["entity_id"] == "event.luna_visit"
    ]
    assert [(attrs["event_type"], attrs["event_id"]) for attrs in luna] == [
        ("poop", "ev-7"),
        ("pee", "ev-8"),
    ]
    assert luna[-1]["camera"] == "Bathroom"
    assert luna[-1]["cats"] == ["Luna"]
    assert hass.states.get("event.milo_visit").state == STATE_UNKNOWN


async def test_unrecognized_visit_fires_unknown_cat(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A new visit without a known cat fires the Unknown cat event."""
    await setup_integration(hass, config_entry)
    await _add_visits(hass, mock_client, config_entry)
    state = hass.states.get("event.unknown_cat_visit")
    assert state.attributes["event_type"] == "lingering"
    assert state.attributes["event_id"] == "ev-9"
    assert state.attributes["cats"] == []
    assert hass.states.get("sensor.unknown_cat_unassigned_visits").state == "2"


async def test_visit_does_not_refire_after_failed_update(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """A visit does not fire again when a failed update repeats the old snapshot."""
    await setup_integration(hass, config_entry)
    coordinator = config_entry.runtime_data.coordinator
    changes = async_capture_events(hass, EVENT_STATE_CHANGED)

    base = fixture_day()
    new_visit = replace(
        base.visits[0],
        event_id="ev-7",
        pet_ids=("pet-luna",),
        type=VisitType.POOP,
        start=base.visits[0].start.replace(hour=10),
    )
    day = DayVisits((*base.visits, new_visit), base.summaries, False)
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )
    frozen_time.tick(timedelta(minutes=5))
    await coordinator.async_refresh()
    await hass.async_block_till_done()
    first_state = hass.states.get("event.luna_visit").state

    frozen_time.tick(timedelta(minutes=5))
    mock_client.get_day.side_effect = SiiPetConnectionError("down")
    await coordinator.async_refresh()
    await hass.async_block_till_done()
    assert coordinator.last_update_success is False
    assert hass.states.get("event.luna_visit").state == STATE_UNAVAILABLE

    frozen_time.tick(timedelta(minutes=5))
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    luna_fires = {
        change.data["new_state"].state
        for change in changes
        if change.data["entity_id"] == "event.luna_visit"
        and change.data["new_state"].attributes.get("event_id") == "ev-7"
        and change.data["new_state"].state != STATE_UNAVAILABLE
    }
    assert len(luna_fires) == 1
    assert hass.states.get("event.luna_visit").state == first_state


async def test_new_cat_fires_its_first_visit(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """The first visit of a cat that appears in the same update fires once."""
    await setup_integration(hass, config_entry)
    cats = dict(mock_client.get_cats.return_value)
    cats["pet-nala"] = Cat(pet_id="pet-nala", name="Nala", avatar_key=None)
    mock_client.get_cats.return_value = cats
    base = fixture_day()
    first = replace(
        base.visits[0],
        event_id="ev-7",
        pet_ids=("pet-nala",),
        type=VisitType.POOP,
        start=base.visits[0].start.replace(hour=10),
    )
    day = DayVisits((*base.visits, first), base.summaries, False)
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )
    changes = async_capture_events(hass, EVENT_STATE_CHANGED)
    coordinator = config_entry.runtime_data.coordinator
    await coordinator.async_refresh()
    await hass.async_block_till_done()
    await coordinator.async_refresh()
    await hass.async_block_till_done()

    fired = [
        change.data["new_state"].attributes
        for change in changes
        if change.data["entity_id"] == "event.nala_visit"
        and change.data["new_state"].attributes.get("event_type")
    ]
    assert [(a["event_type"], a["event_id"]) for a in fired] == [("poop", "ev-7")]
    unknown = [
        change
        for change in changes
        if change.data["entity_id"] == "event.unknown_cat_visit"
        and change.data["new_state"].attributes.get("event_id") == "ev-7"
    ]
    assert unknown == []
