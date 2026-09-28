"""Tests for the calendar months of the SiiPet cats."""

from __future__ import annotations

import asyncio
from datetime import date, timedelta
from typing import Any
from unittest.mock import AsyncMock, call

from freezegun.api import FrozenDateTimeFactory
import pytest

from custom_components.siipet.api import CalendarDay, SiiPetConnectionError
from custom_components.siipet.calendar_data import SiiPetCalendar, month_range

from .common import load_data

DAYS = tuple(
    CalendarDay.from_api(item)
    for item in load_data("pet_calendar.json")["DataCalendar"]
)


def _calendar() -> tuple[SiiPetCalendar, AsyncMock]:
    client = AsyncMock()
    client.get_calendar.return_value = DAYS
    return SiiPetCalendar(client), client


@pytest.mark.parametrize(
    ("month", "first", "last"),
    [
        (date(2026, 9, 15), date(2026, 9, 1), date(2026, 9, 30)),
        (date(2026, 12, 31), date(2026, 12, 1), date(2026, 12, 31)),
        (date(2028, 2, 1), date(2028, 2, 1), date(2028, 2, 29)),
    ],
)
def test_month_range(month: date, first: date, last: date) -> None:
    """A month runs from its first to its last day."""
    assert month_range(month) == (first, last)


async def test_month_reads_the_whole_month() -> None:
    """One call reads the month of the given day for one cat."""
    calendar, client = _calendar()
    assert await calendar.async_month("pet-luna", date(2026, 9, 15)) == DAYS
    client.get_calendar.assert_awaited_once_with(
        "pet-luna", date(2026, 9, 1), date(2026, 9, 30)
    )


async def test_month_cache(freezer: FrozenDateTimeFactory) -> None:
    """A month stays cached for 5 minutes."""
    calendar, client = _calendar()
    await calendar.async_month("pet-luna", date(2026, 9, 1))
    freezer.tick(timedelta(minutes=4, seconds=59))
    await calendar.async_month("pet-luna", date(2026, 9, 30))
    assert client.get_calendar.await_count == 1
    freezer.tick(timedelta(seconds=2))
    await calendar.async_month("pet-luna", date(2026, 9, 1))
    assert client.get_calendar.await_count == 2


async def test_forget_drops_the_month_for_every_cat() -> None:
    """Forgetting a day drops its month for every cat, and keeps other months."""
    calendar, client = _calendar()
    for pet_id, month in (
        ("pet-luna", date(2026, 9, 1)),
        ("pet-milo", date(2026, 9, 1)),
        ("pet-luna", date(2026, 8, 1)),
    ):
        await calendar.async_month(pet_id, month)
    calendar.forget(date(2026, 9, 10))
    client.get_calendar.reset_mock()
    for pet_id, month in (
        ("pet-luna", date(2026, 9, 1)),
        ("pet-milo", date(2026, 9, 1)),
        ("pet-luna", date(2026, 8, 1)),
    ):
        await calendar.async_month(pet_id, month)
    assert client.get_calendar.await_args_list == [
        call("pet-luna", date(2026, 9, 1), date(2026, 9, 30)),
        call("pet-milo", date(2026, 9, 1), date(2026, 9, 30)),
    ]


@pytest.mark.parametrize(
    ("forgotten", "reads"),
    [(date(2026, 9, 10), 2), (date(2026, 8, 10), 1)],
    ids=["same month", "other month"],
)
async def test_forget_during_a_read(forgotten: date, reads: int) -> None:
    """A read does not cache its month when the month is forgotten while it waits."""
    calendar, client = _calendar()
    started = asyncio.Event()
    release = asyncio.Event()

    async def blocked_read(*_: Any) -> tuple[CalendarDay, ...]:
        started.set()
        await release.wait()
        return DAYS

    client.get_calendar.side_effect = blocked_read
    read = asyncio.create_task(calendar.async_month("pet-luna", date(2026, 9, 1)))
    await started.wait()
    calendar.forget(forgotten)
    release.set()
    assert await read == DAYS
    await calendar.async_month("pet-luna", date(2026, 9, 1))
    assert client.get_calendar.await_count == reads


async def test_old_months_are_dropped(freezer: FrozenDateTimeFactory) -> None:
    """A read drops every cached month that is older than 5 minutes."""
    calendar, _client = _calendar()
    await calendar.async_month("pet-milo", date(2026, 8, 1))
    freezer.tick(timedelta(minutes=5))
    await calendar.async_month("pet-luna", date(2026, 9, 1))
    assert list(calendar._months) == [("pet-luna", date(2026, 9, 1))]


async def test_month_error_is_not_cached() -> None:
    """A failed read raises the client error, and the next call reads again."""
    calendar, client = _calendar()
    client.get_calendar.side_effect = [SiiPetConnectionError("down"), DAYS]
    with pytest.raises(SiiPetConnectionError):
        await calendar.async_month("pet-luna", date(2026, 9, 1))
    assert await calendar.async_month("pet-luna", date(2026, 9, 1)) == DAYS
