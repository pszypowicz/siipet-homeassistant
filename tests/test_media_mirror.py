"""Tests for the local copy of SiiPet media."""

from __future__ import annotations

from dataclasses import replace
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from typing import Any
from unittest.mock import AsyncMock, patch

from freezegun.api import FrozenDateTimeFactory
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import issue_registry as ir
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)
from pytest_homeassistant_custom_component.test_util.aiohttp import (
    AiohttpClientMocker,
    AiohttpClientMockResponse,
)

from custom_components.siipet.const import DOMAIN
from custom_components.siipet.media_mirror import (
    ISSUE_DISK_FULL,
    ISSUE_FOLDER,
    MIN_FREE_BYTES,
)
from custom_components.siipet.media_store import key_hash

from .common import (
    COVER,
    S3,
    STOOL,
    TODAY,
    VIDEO,
    day_folder,
    md5_hex,
    mirror_visit,
    mock_s3,
    s3_gets,
    serve_days,
    setup_mirror,
)


async def _refresh(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    await entry.runtime_data.coordinator.async_refresh()
    await hass.async_block_till_done(wait_background_tasks=True)


def _put(path: Path, data: bytes) -> None:
    """Write a file for a test, with its folders."""
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)


def _issue(hass: HomeAssistant, issue_id: str) -> ir.IssueEntry | None:
    return ir.async_get(hass).async_get_issue(DOMAIN, issue_id)


async def test_new_visit_media_is_stored(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """The recording, the cover, the stool photo, and the avatars land on disk."""
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    folder = day_folder(media_dir)
    assert (folder / "ev-1.mp4").read_bytes() == VIDEO
    assert (folder / "ev-1.cover.jpg").read_bytes() == COVER
    assert (folder / "ev-1.stool.jpg").read_bytes() == STOOL
    avatars = media_dir / ".siipet" / "avatars"
    assert (avatars / f"pet-luna.{key_hash('resources/luna.jpg')}.jpg").exists()
    assert (avatars / f"pet-milo.{key_hash('resources/milo.jpg')}.jpg").exists()


async def test_default_is_seven_days(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """An entry without the option keeps 7 days."""
    old = mirror_visit(start=mirror_visit().start - timedelta(days=7))
    week = mirror_visit(event_id="ev-7", start=mirror_visit().start - timedelta(days=6))
    serve_days(
        mock_client,
        {
            TODAY: (mirror_visit(),),
            TODAY - timedelta(days=6): (week,),
            TODAY - timedelta(days=7): (old,),
        },
    )
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, None)
    assert (day_folder(media_dir) / "ev-1.mp4").exists()
    assert (day_folder(media_dir, TODAY - timedelta(days=6)) / "ev-7.mp4").exists()
    assert not day_folder(media_dir, TODAY - timedelta(days=7)).exists()


async def test_zero_days_deletes_the_copy(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """With 0 days, the setup deletes the folder and downloads nothing."""
    _put(day_folder(media_dir) / "ev-1.mp4", VIDEO)
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 0)
    assert not (media_dir / ".siipet").exists()
    assert aioclient_mock.call_count == 0
    assert config_entry.runtime_data.mirror is None


async def test_backfill_reads_days_before_the_coordinator_window(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """A day older than the 7 polled days comes from its own day read."""
    old_day = TODAY - timedelta(days=9)
    old = mirror_visit(start=mirror_visit().start - timedelta(days=9))
    serve_days(mock_client, {old_day: (old,)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 10)
    assert (day_folder(media_dir, old_day) / "ev-1.mp4").read_bytes() == VIDEO


async def test_visit_outside_the_window_is_not_stored(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """With 1 day, a visit of yesterday stays in the cloud."""
    old = mirror_visit(start=mirror_visit().start - timedelta(days=1))
    serve_days(mock_client, {TODAY - timedelta(days=1): (old,)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 1)
    assert s3_gets(aioclient_mock, "events/ev-1/video.mp4") == 0
    assert not day_folder(media_dir, TODAY - timedelta(days=1)).exists()


async def test_wrong_hash_waits_before_the_next_try(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    frozen_time: FrozenDateTimeFactory,
    media_dir: Path,
) -> None:
    """A recording with a wrong MD5 is not stored and waits 5 minutes."""
    serve_days(mock_client, {TODAY: (mirror_visit(video_md5=md5_hex(b"other")),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert not (day_folder(media_dir) / "ev-1.mp4").exists()
    assert (day_folder(media_dir) / "ev-1.cover.jpg").exists()
    assert s3_gets(aioclient_mock, "events/ev-1/video.mp4") == 1

    frozen_time.tick(timedelta(minutes=1))
    await _refresh(hass, config_entry)
    assert s3_gets(aioclient_mock, "events/ev-1/video.mp4") == 1

    frozen_time.tick(timedelta(minutes=5))
    await _refresh(hass, config_entry)
    assert s3_gets(aioclient_mock, "events/ev-1/video.mp4") == 2


async def test_403_renews_the_credentials(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """After a 403, the download signs again with new credentials."""
    statuses = [403, 200]

    async def respond(method: str, url: Any, data: Any) -> AiohttpClientMockResponse:
        return AiohttpClientMockResponse(
            method, url, status=statuses.pop(0), response=VIDEO
        )

    serve_days(mock_client, {TODAY: (mirror_visit(cover_key=None, stool_key=None),)})
    aioclient_mock.get(S3 + "events/ev-1/video.mp4", side_effect=respond)
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert (day_folder(media_dir) / "ev-1.mp4").read_bytes() == VIDEO
    assert mock_client.get_media_credentials.await_count == 2


async def test_unfinished_upload_is_stored_later(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """A visit without its cloud recording gets it on a later update."""
    serve_days(mock_client, {TODAY: (mirror_visit(cloud_stored=False),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert (day_folder(media_dir) / "ev-1.cover.jpg").exists()
    assert not (day_folder(media_dir) / "ev-1.mp4").exists()

    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    await _refresh(hass, config_entry)
    assert (day_folder(media_dir) / "ev-1.mp4").read_bytes() == VIDEO


async def test_low_disk_space_stops_the_copy_and_raises_an_issue(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """Below 1 GB of free space, nothing downloads until space returns."""
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    with patch(
        "custom_components.siipet.media_store.shutil.disk_usage",
        return_value=SimpleNamespace(free=MIN_FREE_BYTES - 1),
    ):
        await setup_mirror(hass, config_entry, 7)
    assert aioclient_mock.call_count == 0
    assert _issue(hass, ISSUE_DISK_FULL) is not None

    await _refresh(hass, config_entry)
    assert (day_folder(media_dir) / "ev-1.mp4").exists()
    assert _issue(hass, ISSUE_DISK_FULL) is None


async def test_folder_that_cannot_be_written_raises_an_issue(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """A folder that cannot be created leaves the entry loaded, with an issue."""
    _put(media_dir / ".siipet", b"a file, not a folder")
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert config_entry.state is ConfigEntryState.LOADED
    assert config_entry.runtime_data.mirror is None
    assert _issue(hass, ISSUE_FOLDER) is not None
    assert aioclient_mock.call_count == 0


async def test_no_local_media_folder_raises_an_issue(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
) -> None:
    """Without a local media folder in Home Assistant, the copy stays off."""
    hass.config.media_dirs = {}
    await setup_mirror(hass, config_entry, 7)
    assert config_entry.state is ConfigEntryState.LOADED
    assert config_entry.runtime_data.mirror is None
    assert _issue(hass, ISSUE_FOLDER) is not None


async def test_a_later_setup_clears_the_folder_issue(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """The folder issue goes when the folder works again."""
    ir.async_create_issue(
        hass,
        DOMAIN,
        ISSUE_FOLDER,
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=ISSUE_FOLDER,
    )
    serve_days(mock_client, {})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert _issue(hass, ISSUE_FOLDER) is None


async def test_daily_cleanup_deletes_days_that_left_the_window(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    frozen_time: FrozenDateTimeFactory,
    media_dir: Path,
) -> None:
    """The setup and the daily run at 00:05 delete day folders before the window."""
    for offset in (1, 2):
        folder = day_folder(media_dir, TODAY - timedelta(days=offset))
        _put(folder / f"ev-old-{offset}.mp4", b"old")
    serve_days(mock_client, {})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 2)
    assert day_folder(media_dir, TODAY - timedelta(days=1)).exists()
    assert not day_folder(media_dir, TODAY - timedelta(days=2)).exists()

    next_run = datetime.fromisoformat("2026-09-27T00:05:00+00:00")
    frozen_time.move_to(next_run)
    async_fire_time_changed(hass, next_run)
    await hass.async_block_till_done(wait_background_tasks=True)
    assert not day_folder(media_dir, TODAY - timedelta(days=1)).exists()


async def test_download_that_ends_after_midnight_is_dropped(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    frozen_time: FrozenDateTimeFactory,
    media_dir: Path,
) -> None:
    """A file whose day leaves the window during its download is not kept."""
    # Local midnight in Tokyo comes before the fixture credentials expire.
    await hass.config.async_set_time_zone("Asia/Tokyo")
    frozen_time.move_to("2026-09-26T14:59:59+00:00")

    async def respond(method: str, url: Any, data: Any) -> AiohttpClientMockResponse:
        frozen_time.move_to("2026-09-26T15:00:01+00:00")
        return AiohttpClientMockResponse(method, url, response=VIDEO)

    serve_days(mock_client, {TODAY: (mirror_visit(cover_key=None, stool_key=None),)})
    aioclient_mock.get(S3 + "events/ev-1/video.mp4", side_effect=respond)
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 1)
    assert s3_gets(aioclient_mock, "events/ev-1/video.mp4") == 1
    assert not (day_folder(media_dir) / "ev-1.mp4").exists()


async def test_new_avatar_key_replaces_the_avatar(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    frozen_time: FrozenDateTimeFactory,
    media_dir: Path,
) -> None:
    """A cat with a new avatar gets the new file, and the old one goes."""
    serve_days(mock_client, {})
    mock_s3(aioclient_mock, **{"resources/luna-2.jpg": b"luna-2"})
    await setup_mirror(hass, config_entry, 7)
    avatars = media_dir / ".siipet" / "avatars"
    old = avatars / f"pet-luna.{key_hash('resources/luna.jpg')}.jpg"
    assert old.exists()

    cats = dict(mock_client.get_cats.return_value)
    cats["pet-luna"] = replace(cats["pet-luna"], avatar_key="resources/luna-2.jpg")
    mock_client.get_cats.return_value = cats
    frozen_time.tick(timedelta(hours=1))
    await _refresh(hass, config_entry)
    assert not old.exists()
    new = avatars / f"pet-luna.{key_hash('resources/luna-2.jpg')}.jpg"
    assert new.read_bytes() == b"luna-2"


async def test_forget_deletes_the_files_of_a_visit(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """A forgotten visit loses its files."""
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    mirror = config_entry.runtime_data.mirror
    assert mirror is not None
    mirror.async_forget("ev-1")
    await hass.async_block_till_done(wait_background_tasks=True)
    assert list(day_folder(media_dir).iterdir()) == []


async def test_removing_the_entry_deletes_the_copy(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
    media_dir: Path,
) -> None:
    """Removing the entry deletes the whole folder."""
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert (media_dir / ".siipet").exists()
    await hass.config_entries.async_remove(config_entry.entry_id)
    await hass.async_block_till_done()
    assert not (media_dir / ".siipet").exists()


async def test_unload_stops_the_copy(
    hass: HomeAssistant,
    mock_client: AsyncMock,
    config_entry: MockConfigEntry,
    aioclient_mock: AiohttpClientMocker,
) -> None:
    """The entry unloads with the copy running."""
    serve_days(mock_client, {TODAY: (mirror_visit(),)})
    mock_s3(aioclient_mock)
    await setup_mirror(hass, config_entry, 7)
    assert await hass.config_entries.async_unload(config_entry.entry_id)
    assert config_entry.state is ConfigEntryState.NOT_LOADED
