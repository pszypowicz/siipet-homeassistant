"""Calendar months of the SiiPet cats, for the dashboard card."""

from __future__ import annotations

from datetime import date, datetime, timedelta

from homeassistant.util import dt as dt_util

from .api import CalendarDay, SiiPetClient

CALENDAR_CACHE = timedelta(minutes=5)


def month_range(day: date) -> tuple[date, date]:
    """Return the first and the last day of the month of `day`."""
    first = day.replace(day=1)
    last = (first + timedelta(days=32)).replace(day=1) - timedelta(days=1)
    return first, last


class SiiPetCalendar:
    """Read the calendar months of the cats, and keep each one for 5 minutes."""

    def __init__(self, client: SiiPetClient) -> None:
        """Create the calendar for one config entry."""
        self.client = client
        self._months: dict[
            tuple[str, date], tuple[datetime, tuple[CalendarDay, ...]]
        ] = {}

    async def async_month(self, pet_id: str, day: date) -> tuple[CalendarDay, ...]:
        """Return the calendar days of one cat in the month of `day`."""
        first, last = month_range(day)
        now = dt_util.utcnow()
        cached = self._months.get((pet_id, first))
        if cached is not None and now - cached[0] < CALENDAR_CACHE:
            return cached[1]
        days = await self.client.get_calendar(pet_id, first, last)
        self._months[(pet_id, first)] = (now, days)
        return days

    def forget(self, day: date) -> None:
        """Drop the month of `day` for every cat."""
        first = day.replace(day=1)
        self._months = {
            key: value for key, value in self._months.items() if key[1] != first
        }
