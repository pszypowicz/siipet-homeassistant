"""Helpers shared by the SiiPet tests."""

from __future__ import annotations

import base64
from datetime import date
import json
from pathlib import Path
from typing import Any

from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.api import DayVisits

FIXTURES = Path(__file__).parent / "fixtures"
NOW = "2026-09-26T12:00:00+00:00"
TODAY = date(2026, 9, 26)
EMPTY_DAY = DayVisits((), {}, False)


def load_fixture(name: str) -> dict[str, Any]:
    """Return a JSON fixture as a dict. Fixtures hold full response envelopes."""
    return json.loads((FIXTURES / name).read_text())


def load_data(name: str) -> Any:
    """Return the `Data` part of a JSON fixture."""
    return load_fixture(name)["Data"]


def make_token(user_id: str) -> str:
    """Return an unsigned JWT with a UserId claim."""

    def part(value: dict[str, Any]) -> str:
        raw = json.dumps(value, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    return f"{part({'alg': 'HS256', 'typ': 'JWT'})}.{part({'UserId': user_id})}.sig"


def fixture_day() -> DayVisits:
    """The visits of the fixture day."""
    return DayVisits.from_api(load_data("toilet_event_day.json"))


async def setup_integration(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    """Set up the entry and wait for the platforms."""
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
