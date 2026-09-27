"""Tests for the websocket commands of the SiiPet card."""

from __future__ import annotations

from datetime import timedelta
from http import HTTPStatus
import json
from typing import Any
from unittest.mock import AsyncMock

from homeassistant.config_entries import SOURCE_REAUTH
from homeassistant.core import HomeAssistant
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.test_util.aiohttp import (
    AiohttpClientMocker,
)
from pytest_homeassistant_custom_component.typing import (
    ClientSessionGenerator,
    WebSocketGenerator,
)

from custom_components.siipet.api import SiiPetAuthError, SiiPetConnectionError
from custom_components.siipet.const import DOMAIN, UNKNOWN_CAT_ID

from .common import EMPTY_DAY, TODAY, fixture_day, setup_integration, siipet_device_id

COVER_URL = "https://media-bucket.s3.amazonaws.com/events/ev-1/cover.jpg"


async def _ws(
    hass: HomeAssistant, hass_ws_client: WebSocketGenerator, **message: Any
) -> dict[str, Any]:
    client = await hass_ws_client(hass)
    await client.send_json_auto_id(message)
    return await client.receive_json()


def _private_values(response: dict[str, Any]) -> list[str]:
    """Return the private values found outside the signed avatar paths."""
    text = json.dumps(response)
    for cat in (response.get("result") or {}).get("cats") or ():
        if cat.get("avatar"):
            text = text.replace(cat["avatar"], "")
    return [
        value
        for value in (
            "pet-luna",
            "pet-milo",
            "SN0001",
            "SN0002",
            "events/",
            "amazonaws",
        )
        if value in text
    ]


async def test_cats(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The cats come with signed avatar paths and the number of waiting visits."""
    await setup_integration(hass, config_entry)
    response = await _ws(hass, hass_ws_client, type="siipet/cats")
    assert response["success"]
    result = response["result"]
    assert [(cat["device_id"], cat["name"]) for cat in result["cats"]] == [
        (siipet_device_id(hass, config_entry, "pet-luna"), "Luna"),
        (siipet_device_id(hass, config_entry, "pet-milo"), "Milo"),
    ]
    assert result["cats"][0]["avatar"].startswith(
        "/api/siipet/image/avatar/pet-luna?authSig="
    )
    assert result["unknown"] == {
        "device_id": siipet_device_id(hass, config_entry, UNKNOWN_CAT_ID),
        "waiting": 1,
    }
    assert _private_values(response) == []


async def test_day(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """A window day comes newest first, with a summary and signed image paths, and no API call."""
    await setup_integration(hass, config_entry)
    reads = mock_client.get_day.await_count
    response = await _ws(
        hass, hass_ws_client, type="siipet/day", date=TODAY.isoformat()
    )
    assert response["success"]
    result = response["result"]
    assert result["summary"] == {"visits": 5, "pee": 3, "poop": 2, "abnormal": 2}
    visits = result["visits"]
    assert [visit["event_id"] for visit in visits] == [
        "ev-6",
        "ev-5",
        "ev-4",
        "ev-1",
        "ev-2",
        "ev-3",
    ]
    first = visits[3]
    assert first["type"] == "poop"
    assert first["cats"] == [
        {"device_id": siipet_device_id(hass, config_entry, "pet-luna"), "name": "Luna"}
    ]
    assert first["cover"].startswith("/api/siipet/image/cover/ev-1?authSig=")
    assert first["stool"].startswith("/api/siipet/image/stool/ev-1?authSig=")
    assert visits[0]["stool"] is None
    assert _private_values(response) == []
    assert mock_client.get_day.await_count == reads


@pytest.mark.parametrize(
    ("identifier", "event_ids", "summary"),
    [
        (
            "pet-luna",
            ["ev-6", "ev-1", "ev-3"],
            {"visits": 2, "pee": 1, "poop": 1, "abnormal": 1},
        ),
        (UNKNOWN_CAT_ID, ["ev-4"], {"visits": 1, "pee": 1, "poop": 0, "abnormal": 0}),
    ],
)
async def test_day_for_one_cat(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    identifier: str,
    event_ids: list[str],
    summary: dict[str, int],
) -> None:
    """A cat filter keeps the visits of that cat, also for the Unknown cat."""
    await setup_integration(hass, config_entry)
    response = await _ws(
        hass,
        hass_ws_client,
        type="siipet/day",
        date=TODAY.isoformat(),
        cat=siipet_device_id(hass, config_entry, identifier),
    )
    assert [visit["event_id"] for visit in response["result"]["visits"]] == event_ids
    assert response["result"]["summary"] == summary


async def test_day_older_day(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """A day outside the coordinator window reads through the media cache."""
    await setup_integration(hass, config_entry)
    day = TODAY - timedelta(days=20)
    mock_client.get_day.side_effect = lambda requested, **_: (
        fixture_day() if requested == day else EMPTY_DAY
    )
    response = await _ws(hass, hass_ws_client, type="siipet/day", date=day.isoformat())
    assert len(response["result"]["visits"]) == 6
    assert mock_client.get_day.await_args_list[-1].args[0] == day


@pytest.mark.parametrize(
    ("message", "code", "key"),
    [
        (
            {"date": (TODAY - timedelta(days=31)).isoformat()},
            "service_validation_error",
            "date_out_of_range",
        ),
        (
            {"date": TODAY.isoformat(), "cat": "no-such-device"},
            "service_validation_error",
            "invalid_cat",
        ),
        (
            {"date": (TODAY - timedelta(days=20)).isoformat()},
            "home_assistant_error",
            "request_failed",
        ),
    ],
)
async def test_day_errors(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    caplog: pytest.LogCaptureFixture,
    message: dict[str, Any],
    code: str,
    key: str,
) -> None:
    """Errors carry the translated key of the actions and leave no error in the log."""
    await setup_integration(hass, config_entry)
    mock_client.get_day.side_effect = SiiPetConnectionError("down")
    response = await _ws(hass, hass_ws_client, type="siipet/day", **message)
    assert not response["success"]
    assert response["error"]["code"] == code
    assert response["error"]["translation_key"] == key
    assert response["error"]["translation_domain"] == DOMAIN
    assert "Error handling message" not in caplog.text


async def test_day_auth_error_starts_reauth(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """An auth error on an older day raises a translated error and starts reauth."""
    await setup_integration(hass, config_entry)
    mock_client.get_day.side_effect = SiiPetAuthError("-2: token illegal")
    day = TODAY - timedelta(days=20)
    response = await _ws(hass, hass_ws_client, type="siipet/day", date=day.isoformat())
    assert not response["success"]
    assert response["error"]["translation_key"] == "request_failed"
    await hass.async_block_till_done()
    flows = hass.config_entries.flow.async_progress_by_handler(DOMAIN)
    assert [flow["context"]["source"] for flow in flows] == [SOURCE_REAUTH]


async def test_queue(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
) -> None:
    """The queue holds the visits of the window without a cat, newest first."""
    await setup_integration(hass, config_entry)
    response = await _ws(hass, hass_ws_client, type="siipet/queue")
    assert response["success"]
    [visit] = response["result"]["visits"]
    assert visit["event_id"] == "ev-4"
    assert visit["cats"] == []
    assert visit["cover"].startswith("/api/siipet/image/cover/ev-4?authSig=")
    assert _private_values(response) == []


@pytest.mark.parametrize("command", ["siipet/cats", "siipet/queue"])
async def test_not_loaded(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    command: str,
) -> None:
    """Without a loaded entry, the commands answer with not_loaded."""
    await setup_integration(hass, config_entry)
    await hass.config_entries.async_unload(config_entry.entry_id)
    response = await _ws(hass, hass_ws_client, type=command)
    assert response["error"]["translation_key"] == "not_loaded"


async def test_signed_cover_path_loads_without_login(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    hass_ws_client: WebSocketGenerator,
    hass_client_no_auth: ClientSessionGenerator,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """A signed cover path works in an img tag, which sends no login header."""
    aioclient_mock.get(COVER_URL, content=b"jpeg-bytes")
    await setup_integration(hass, config_entry)
    response = await _ws(
        hass, hass_ws_client, type="siipet/day", date=TODAY.isoformat()
    )
    path = next(
        visit["cover"]
        for visit in response["result"]["visits"]
        if visit["event_id"] == "ev-1"
    )
    client = await hass_client_no_auth()
    image = await client.get(path)
    assert image.status == HTTPStatus.OK
    assert await image.read() == b"jpeg-bytes"
