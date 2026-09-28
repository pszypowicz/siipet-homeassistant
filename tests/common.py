"""Helpers shared by the SiiPet tests."""

from __future__ import annotations

import base64
from dataclasses import replace
from datetime import date
import hashlib
import json
from pathlib import Path
from typing import Any
from unittest.mock import AsyncMock

from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.test_util.aiohttp import (
    AiohttpClientMocker,
)

from custom_components.siipet.api import DayVisits, Visit
from custom_components.siipet.const import CONF_MEDIA_DAYS, DOMAIN

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


def make_token(user_id: str, exp: Any = None) -> str:
    """Return an unsigned JWT with a UserId claim, and an exp claim when given."""

    def part(value: dict[str, Any]) -> str:
        raw = json.dumps(value, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    payload: dict[str, Any] = {"UserId": user_id}
    if exp is not None:
        payload["exp"] = exp
    return f"{part({'alg': 'HS256', 'typ': 'JWT'})}.{part(payload)}.sig"


def fixture_day() -> DayVisits:
    """The visits of the fixture day."""
    return DayVisits.from_api(load_data("toilet_event_day.json"))


def siipet_device_id(
    hass: HomeAssistant, entry: MockConfigEntry, identifier: str
) -> str:
    """Return the device id of a SiiPet cat or camera."""
    device = dr.async_get(hass).async_get_device_by_identifier(
        (DOMAIN, identifier), entry.entry_id
    )
    assert device is not None
    return device.id


async def setup_integration(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    """Set up the entry and wait for the platforms."""
    assert await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()


S3 = "https://media-bucket.s3.amazonaws.com/"
VIDEO = b"video-ev-1"
COVER = b"cover-ev-1"
STOOL = b"stool-ev-1"
MIRROR_FILES = {
    "events/ev-1/video.mp4": VIDEO,
    "events/ev-1/cover.jpg": COVER,
    "events/ev-1/stool.jpg": STOOL,
    "resources/luna.jpg": b"luna",
    "resources/milo.jpg": b"milo",
}


def md5_hex(data: bytes) -> str:
    """Return the MD5 of `data` in the format of the API."""
    return hashlib.md5(data).hexdigest()


def mirror_visit(**changes: Any) -> Visit:
    """Visit ev-1 of the fixture day, with sizes and a hash that match MIRROR_FILES."""
    base = next(visit for visit in fixture_day().visits if visit.event_id == "ev-1")
    values: dict[str, Any] = {
        "video_size": len(VIDEO),
        "video_md5": md5_hex(VIDEO),
        "cover_size": len(COVER),
        "stool_size": len(STOOL),
    }
    values.update(changes)
    return replace(base, **values)


def serve_days(mock_client: AsyncMock, days: dict[date, tuple[Visit, ...]]) -> None:
    """Let the client return these visits for these days, and none for others."""
    base = fixture_day()
    mock_client.get_day.side_effect = lambda requested, **_: (
        replace(base, visits=days[requested]) if requested in days else EMPTY_DAY
    )


def mock_s3(aioclient_mock: AiohttpClientMocker, **extra: bytes) -> None:
    """Serve MIRROR_FILES and `extra` from the mocked S3 bucket."""
    for key, body in {**MIRROR_FILES, **extra}.items():
        aioclient_mock.get(S3 + key, content=body)


def s3_gets(aioclient_mock: AiohttpClientMocker, key: str) -> int:
    """Count the S3 requests for one key."""
    return sum(1 for call in aioclient_mock.mock_calls if call[1].path == f"/{key}")


def day_folder(media_dir: Path, day: date = TODAY) -> Path:
    """Return the folder of the local copy for one day."""
    return media_dir / ".siipet" / day.isoformat()


async def setup_mirror(
    hass: HomeAssistant, entry: MockConfigEntry, days: int | None
) -> None:
    """Set up the entry with local media for `days` days, and wait for the downloads.

    None leaves the option out, so the default applies.
    """
    options = {} if days is None else {CONF_MEDIA_DAYS: days}
    hass.config_entries.async_update_entry(entry, options=options)
    await setup_integration(hass, entry)
    await hass.async_block_till_done(wait_background_tasks=True)
