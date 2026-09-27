"""Tests for the SiiPet coordinator."""

from __future__ import annotations

from dataclasses import replace
from datetime import date, time, timedelta
import logging
from unittest.mock import AsyncMock

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import SOURCE_REAUTH
from homeassistant.core import HomeAssistant
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.api import (
    DayVisits,
    SiiPetAuthError,
    SiiPetConnectionError,
    Visit,
    VisitType,
)
from custom_components.siipet.const import DOMAIN, UNKNOWN_CAT_ID
from custom_components.siipet.coordinator import SiiPetCoordinator

from .common import EMPTY_DAY, TODAY, fixture_day, setup_integration


def _days(mock_client: AsyncMock) -> list[date]:
    return [call.args[0] for call in mock_client.get_day.await_args_list]


async def test_today_summary_until_now(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Today is read up to the local time, so its baselines count up to now."""
    await setup_integration(hass, config_entry)
    calls = mock_client.get_day.await_args_list
    today = [call for call in calls if call.args[0] == TODAY]
    assert [call.kwargs for call in today] == [{"until": time(12, 0)}]
    assert all(call.kwargs == {} for call in calls if call.args[0] != TODAY)


def _with_visits(*extra: Visit, more: bool = False) -> DayVisits:
    base = fixture_day()
    return DayVisits(base.visits + extra, base.summaries, more)


def _new_visit(event_id: str, pet_ids: tuple[str, ...], hour: int) -> Visit:
    base = fixture_day().visits[0]
    return replace(
        base,
        event_id=event_id,
        pet_ids=pet_ids,
        start=base.start.replace(hour=hour),
        type=VisitType.POOP,
    )


def _visit_on(
    day: date, event_id: str, pet_ids: tuple[str, ...] = ("pet-luna",)
) -> Visit:
    """A visit like the fixture's first visit, but dated on another day."""
    base = fixture_day().visits[0]
    return replace(
        base,
        event_id=event_id,
        pet_ids=pet_ids,
        start=base.start.replace(year=day.year, month=day.month, day=day.day),
        type=VisitType.POOP,
    )


async def _coordinator(
    hass: HomeAssistant, config_entry: MockConfigEntry
) -> SiiPetCoordinator:
    await setup_integration(hass, config_entry)
    return config_entry.runtime_data.coordinator


async def test_first_refresh_reads_window(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """The first update reads 7 days, the cats, the cameras, and the labels."""
    coordinator = await _coordinator(hass, config_entry)
    assert _days(mock_client) == [TODAY - timedelta(days=n) for n in range(7)]
    mock_client.get_cats.assert_awaited_once()
    mock_client.get_cameras.assert_awaited_once()
    mock_client.get_abnormal_labels.assert_awaited_once()
    data = coordinator.data
    assert data.today == TODAY
    assert data.updated_at.isoformat() == "2026-09-26T12:00:00+00:00"
    assert len(data.days) == 7
    assert data.new_visits == ()
    assert data.summaries["pet-luna"].baseline_times == 3.5


async def test_next_refresh_reads_today(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """Within the hour, an update reads only today."""
    coordinator = await _coordinator(hass, config_entry)
    mock_client.get_day.reset_mock()
    frozen_time.tick(timedelta(minutes=5))
    await coordinator.async_refresh()
    assert _days(mock_client) == [TODAY]
    mock_client.get_cats.assert_awaited_once()


async def test_hourly_refresh_reads_window(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """After an hour, an update reads the past days and syncs again."""
    coordinator = await _coordinator(hass, config_entry)
    mock_client.get_day.reset_mock()
    frozen_time.tick(timedelta(hours=1))
    await coordinator.async_refresh()
    assert len(_days(mock_client)) == 7
    assert mock_client.get_cats.await_count == 2


async def test_yesterday_after_midnight(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """During the first hour of a day, every update also reads yesterday."""
    coordinator = await _coordinator(hass, config_entry)
    frozen_time.move_to("2026-09-26T23:59:00+00:00")
    await coordinator.async_refresh()
    tomorrow = TODAY + timedelta(days=1)

    for moment in ("2026-09-27T00:04:00+00:00", "2026-09-27T00:09:00+00:00"):
        mock_client.get_day.reset_mock()
        frozen_time.move_to(moment)
        await coordinator.async_refresh()
        assert _days(mock_client) == [tomorrow, TODAY]

    mock_client.get_day.reset_mock()
    frozen_time.move_to("2026-09-27T01:05:00+00:00")
    await coordinator.async_refresh()
    assert _days(mock_client)[0] == tomorrow
    assert TODAY not in _days(mock_client)
    assert min(coordinator.data.days) == tomorrow - timedelta(days=6)


async def test_new_visits(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Visits that were not seen before appear once in new_visits, oldest first."""
    coordinator = await _coordinator(hass, config_entry)
    later = _new_visit("ev-8", ("pet-milo",), 11)
    earlier = _new_visit("ev-7", ("pet-luna",), 10)
    day = _with_visits(later, earlier)
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )

    await coordinator.async_refresh()
    assert [visit.event_id for visit in coordinator.data.new_visits] == ["ev-7", "ev-8"]

    await coordinator.async_refresh()
    assert coordinator.data.new_visits == ()


async def test_unknown_cat(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A visit without a known cat belongs to the Unknown cat."""
    coordinator = await _coordinator(hass, config_entry)
    data = coordinator.data
    unrecognized = next(visit for visit in data.days[TODAY] if visit.event_id == "ev-4")
    assert data.cat_ids(unrecognized) == (UNKNOWN_CAT_ID,)
    assert [visit.event_id for visit in data.visits(UNKNOWN_CAT_ID)] == ["ev-4"]
    assert [visit.event_id for visit in data.visits("pet-luna", TODAY)] == [
        "ev-1",
        "ev-3",
        "ev-6",
    ]


async def test_visit_with_one_unknown_pet_id_belongs_to_the_known_cat(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A visit with one known and one unknown pet id belongs only to the known cat."""
    coordinator = await _coordinator(hass, config_entry)
    visit = _new_visit("ev-7", ("pet-luna", "pet-ghost"), 10)
    assert coordinator.data.cat_ids(visit) == ("pet-luna",)


async def test_visit_with_two_known_pet_ids_belongs_to_both_cats(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A visit with two known pet ids belongs to both cats."""
    coordinator = await _coordinator(hass, config_entry)
    visit = _new_visit("ev-7", ("pet-luna", "pet-milo"), 10)
    assert coordinator.data.cat_ids(visit) == ("pet-luna", "pet-milo")


async def test_unknown_pet_id_syncs_once(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """A new unknown PetId triggers one extra sync, not one per update."""
    coordinator = await _coordinator(hass, config_entry)
    day = _with_visits(_new_visit("ev-7", ("pet-new",), 10))
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )

    frozen_time.tick(timedelta(minutes=5))
    await coordinator.async_refresh()
    assert mock_client.get_cats.await_count == 2
    frozen_time.tick(timedelta(minutes=5))
    await coordinator.async_refresh()
    assert mock_client.get_cats.await_count == 2
    visit = next(v for v in coordinator.data.days[TODAY] if v.event_id == "ev-7")
    assert coordinator.data.cat_ids(visit) == (UNKNOWN_CAT_ID,)


async def test_more_pages_warns_once(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A day list with more pages logs one warning."""
    day = _with_visits(more=True)
    mock_client.get_day.side_effect = lambda requested, **_: (
        day if requested == TODAY else EMPTY_DAY
    )
    coordinator = await _coordinator(hass, config_entry)
    await coordinator.async_refresh()
    assert caplog.text.count("has more pages") == 1
    assert coordinator.data.more is True


async def test_auth_error_starts_reauth(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A rejected session during an update starts reauth."""
    coordinator = await _coordinator(hass, config_entry)
    mock_client.get_day.side_effect = SiiPetAuthError("expired")
    await coordinator.async_refresh()
    await hass.async_block_till_done()
    assert coordinator.last_update_success is False
    flows = hass.config_entries.flow.async_progress_by_handler(DOMAIN)
    assert [flow["context"]["source"] for flow in flows] == [SOURCE_REAUTH]


async def test_today_failure_fails_update(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """A connection error on today fails the update."""
    coordinator = await _coordinator(hass, config_entry)
    mock_client.get_day.side_effect = SiiPetConnectionError("down")
    await coordinator.async_refresh()
    assert coordinator.last_update_success is False


async def test_past_day_failure_keeps_data(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """A failed past day keeps its old data, and the update succeeds."""
    coordinator = await _coordinator(hass, config_entry)
    failing = TODAY - timedelta(days=2)
    day = fixture_day()

    def get_day(requested: date, **_: object) -> DayVisits:
        if requested == failing:
            raise SiiPetConnectionError("down")
        return day if requested == TODAY else EMPTY_DAY

    mock_client.get_day.side_effect = get_day
    frozen_time.tick(timedelta(hours=1))
    await coordinator.async_refresh()
    assert coordinator.last_update_success is True
    assert coordinator.data.days[failing] == ()


async def test_labels_failure_is_not_fatal(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Setup works without the abnormal labels."""
    mock_client.get_abnormal_labels.side_effect = SiiPetConnectionError("down")
    coordinator = await _coordinator(hass, config_entry)
    assert coordinator.last_update_success is True
    assert coordinator.data.labels.event == {}


async def test_labels_failure_retries_hourly_and_warns_once(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A failing labels read waits an hour before retrying, and warns once."""
    mock_client.get_abnormal_labels.side_effect = SiiPetConnectionError("down")
    coordinator = await _coordinator(hass, config_entry)
    assert mock_client.get_abnormal_labels.await_count == 1

    frozen_time.tick(timedelta(minutes=5))
    await coordinator.async_refresh()
    assert mock_client.get_abnormal_labels.await_count == 1

    frozen_time.tick(timedelta(minutes=55))
    await coordinator.async_refresh()
    assert mock_client.get_abnormal_labels.await_count == 2

    warnings = [
        record
        for record in caplog.records
        if record.levelno == logging.WARNING
        and "abnormal labels" in record.getMessage()
    ]
    assert len(warnings) == 1


async def test_late_first_read_of_past_day_is_not_new(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """A past day that fails on the first update is not new once it succeeds."""
    failing = TODAY - timedelta(days=3)
    old_visit = _visit_on(failing, "old-1")

    def get_day_failing(requested: date, **_: object) -> DayVisits:
        if requested == failing:
            raise SiiPetConnectionError("down")
        return fixture_day() if requested == TODAY else EMPTY_DAY

    mock_client.get_day.side_effect = get_day_failing
    coordinator = await _coordinator(hass, config_entry)
    assert failing not in coordinator.data.days

    late_day = _with_visits(old_visit)
    mock_client.get_day.side_effect = lambda requested, **_: (
        late_day
        if requested == failing
        else fixture_day()
        if requested == TODAY
        else EMPTY_DAY
    )
    frozen_time.tick(timedelta(minutes=5))
    await coordinator.async_refresh()

    assert coordinator.data.new_visits == ()
    assert old_visit in coordinator.data.days[failing]


async def test_new_visit_on_already_read_past_day_is_new(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    frozen_time: FrozenDateTimeFactory,
) -> None:
    """A new visit on a past day that was already read is still reported."""
    target = TODAY - timedelta(days=2)
    coordinator = await _coordinator(hass, config_entry)
    assert coordinator.data.days[target] == ()

    late_visit = _visit_on(target, "old-2")
    day_with_new = _with_visits(late_visit)
    mock_client.get_day.side_effect = lambda requested, **_: (
        day_with_new
        if requested == target
        else fixture_day()
        if requested == TODAY
        else EMPTY_DAY
    )
    frozen_time.tick(timedelta(hours=1))
    await coordinator.async_refresh()

    assert [visit.event_id for visit in coordinator.data.new_visits] == ["old-2"]
