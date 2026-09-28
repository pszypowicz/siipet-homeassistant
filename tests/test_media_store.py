"""Tests for the local SiiPet media store."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, date, datetime
import hashlib
import logging
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from homeassistant.core import HomeAssistant
import pytest

from custom_components.siipet.api import Visit
from custom_components.siipet.media_store import (
    MediaCheckFailed,
    MediaFile,
    MediaStore,
    MediaStoreError,
    async_delete_folder,
    key_hash,
    visit_day,
)

DAY = date(2026, 9, 26)


async def _chunks(*parts: bytes) -> AsyncIterator[bytes]:
    for part in parts:
        yield part


def _md5(data: bytes) -> str:
    return hashlib.md5(data).hexdigest()


async def _store(hass: HomeAssistant, tmp_path: Path) -> MediaStore:
    store = MediaStore(hass, tmp_path / ".siipet")
    await store.async_load()
    return store


async def _write(
    store: MediaStore,
    kind: MediaFile,
    event_id: str,
    data: bytes,
    day: date = DAY,
) -> bool:
    return await store.async_write(
        kind,
        event_id,
        day,
        _chunks(data),
        size=len(data),
        md5=_md5(data),
        keep=lambda: True,
    )


async def test_write_indexes_a_verified_file(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A download with the right size and MD5 lands in its day folder."""
    store = await _store(hass, tmp_path)
    written = await store.async_write(
        MediaFile.RECORDING,
        "ev-1",
        DAY,
        _chunks(b"ab", b"cd"),
        size=4,
        md5=_md5(b"abcd"),
        keep=lambda: True,
    )
    assert written is True
    path = store.path(MediaFile.RECORDING, "ev-1")
    assert path == tmp_path / ".siipet" / "2026-09-26" / "ev-1.mp4"
    assert path.read_bytes() == b"abcd"
    assert list(path.parent.glob("*.part")) == []
    assert store.stats() == (1, 4)


async def test_write_names_the_image_files(hass: HomeAssistant, tmp_path: Path) -> None:
    """Covers and stool photos get their own suffixes next to the recording."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.COVER, "ev-1", b"cover")
    await _write(store, MediaFile.STOOL, "ev-1", b"stool")
    folder = tmp_path / ".siipet" / "2026-09-26"
    assert store.path(MediaFile.COVER, "ev-1") == folder / "ev-1.cover.jpg"
    assert store.path(MediaFile.STOOL, "ev-1") == folder / "ev-1.stool.jpg"
    assert store.path(MediaFile.RECORDING, "ev-1") is None


@pytest.mark.parametrize(
    ("parts", "size", "md5"),
    [
        ((b"abc",), 4, None),
        ((b"abcd",), 4, "0" * 32),
        ((), None, None),
    ],
)
async def test_write_rejects_a_mismatch(
    hass: HomeAssistant,
    tmp_path: Path,
    parts: tuple[bytes, ...],
    size: int | None,
    md5: str | None,
) -> None:
    """A wrong size, a wrong MD5, or an empty download stores nothing."""
    store = await _store(hass, tmp_path)
    with pytest.raises(MediaCheckFailed):
        await store.async_write(
            MediaFile.RECORDING,
            "ev-1",
            DAY,
            _chunks(*parts),
            size=size,
            md5=md5,
            keep=lambda: True,
        )
    assert store.path(MediaFile.RECORDING, "ev-1") is None
    assert list((tmp_path / ".siipet").rglob("*.*")) == []


async def test_write_without_expected_values(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A download without an expected size or MD5 only has to be non-empty."""
    store = await _store(hass, tmp_path)
    assert await store.async_write(
        MediaFile.COVER,
        "ev-1",
        DAY,
        _chunks(b"x"),
        size=None,
        md5=None,
        keep=lambda: True,
    )
    assert store.path(MediaFile.COVER, "ev-1") is not None


async def test_write_dropped_when_keep_turns_false(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A download for a day that left the window is dropped before the rename."""
    store = await _store(hass, tmp_path)
    written = await store.async_write(
        MediaFile.RECORDING,
        "ev-1",
        DAY,
        _chunks(b"abcd"),
        size=4,
        md5=_md5(b"abcd"),
        keep=lambda: False,
    )
    assert written is False
    assert store.path(MediaFile.RECORDING, "ev-1") is None
    assert list((tmp_path / ".siipet").rglob("*.*")) == []


async def test_write_dropped_when_keep_turns_false_during_the_rename(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A delete during the rename leaves no file and no index entry."""
    store = await _store(hass, tmp_path)
    answers = iter([True, False])
    written = await store.async_write(
        MediaFile.RECORDING,
        "ev-1",
        DAY,
        _chunks(b"abcd"),
        size=4,
        md5=_md5(b"abcd"),
        keep=lambda: next(answers),
    )
    assert written is False
    assert store.path(MediaFile.RECORDING, "ev-1") is None
    assert list((tmp_path / ".siipet").rglob("*.*")) == []


async def test_delete_visit_does_not_wait_for_a_write(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A visit delete finishes while a download of another visit holds the lock."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.COVER, "ev-1", b"cover")
    started = asyncio.Event()
    release = asyncio.Event()

    async def stalled_chunks() -> AsyncIterator[bytes]:
        yield b"ab"
        started.set()
        await release.wait()
        yield b"cd"

    task = hass.async_create_task(
        store.async_write(
            MediaFile.RECORDING,
            "ev-2",
            DAY,
            stalled_chunks(),
            size=4,
            md5=None,
            keep=lambda: True,
        )
    )
    await started.wait()
    delete = hass.async_create_task(store.async_delete_visit("ev-1"))
    await asyncio.sleep(0)
    try:
        assert store.path(MediaFile.COVER, "ev-1") is None
        await delete
        assert not (tmp_path / ".siipet" / "2026-09-26" / "ev-1.cover.jpg").exists()
    finally:
        release.set()
    assert await task is True


@pytest.mark.parametrize("event_id", ["../ev-1", "ev 1", "", "ev/1"])
async def test_write_rejects_an_unsafe_id(
    hass: HomeAssistant, tmp_path: Path, event_id: str
) -> None:
    """An id that is not a plain name never becomes part of a path."""
    store = await _store(hass, tmp_path)
    with pytest.raises(MediaStoreError):
        await _write(store, MediaFile.RECORDING, event_id, b"abcd")
    assert list((tmp_path / ".siipet").rglob("*.*")) == []


async def test_write_reports_a_folder_that_cannot_be_written(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A write error becomes MediaStoreError, and the partial file goes away."""
    store = await _store(hass, tmp_path)
    (tmp_path / ".siipet" / "2026-09-26").write_text("a file, not a folder")
    with pytest.raises(MediaStoreError):
        await _write(store, MediaFile.RECORDING, "ev-1", b"abcd")
    assert store.path(MediaFile.RECORDING, "ev-1") is None


async def test_load_indexes_complete_files_and_deletes_partial_ones(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """The scan indexes finished files, deletes .part files, and skips other names."""
    root = tmp_path / ".siipet"
    day = root / "2026-09-26"
    day.mkdir(parents=True)
    (day / "ev-1.mp4").write_bytes(b"video")
    (day / "ev-1.cover.jpg").write_bytes(b"cover")
    (day / "ev-2.stool.jpg.part").write_bytes(b"half")
    (day / "notes.txt").write_bytes(b"other")
    (root / "not-a-day").mkdir()
    (root / "not-a-day" / "ev-3.mp4").write_bytes(b"video")
    (root / "avatars").mkdir()
    (root / "avatars" / f"pet-luna.{key_hash('cats/luna.jpg')}.jpg").write_bytes(b"a")
    (root / "avatars" / "pet-milo.jpg.part").write_bytes(b"half")

    store = MediaStore(hass, root)
    await store.async_load()

    assert store.path(MediaFile.RECORDING, "ev-1") == day / "ev-1.mp4"
    assert store.path(MediaFile.COVER, "ev-1") == day / "ev-1.cover.jpg"
    assert store.path(MediaFile.STOOL, "ev-2") is None
    assert store.path(MediaFile.RECORDING, "ev-3") is None
    assert not (day / "ev-2.stool.jpg.part").exists()
    assert not (root / "avatars" / "pet-milo.jpg.part").exists()
    assert store.avatar_path("pet-luna", "cats/luna.jpg") is not None
    assert store.stats() == (3, 11)


async def test_load_creates_the_folder(hass: HomeAssistant, tmp_path: Path) -> None:
    """A first load creates the folder."""
    store = MediaStore(hass, tmp_path / "media" / ".siipet")
    await store.async_load()
    assert (tmp_path / "media" / ".siipet").is_dir()
    assert store.stats() == (0, 0)


async def test_delete_visit(hass: HomeAssistant, tmp_path: Path) -> None:
    """Deleting a visit removes its files and its index entry."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.RECORDING, "ev-1", b"video")
    await _write(store, MediaFile.COVER, "ev-1", b"cover")
    await _write(store, MediaFile.COVER, "ev-2", b"cover")
    await store.async_delete_visit("ev-1")
    assert store.path(MediaFile.RECORDING, "ev-1") is None
    assert store.path(MediaFile.COVER, "ev-1") is None
    assert not (tmp_path / ".siipet" / "2026-09-26" / "ev-1.mp4").exists()
    assert store.path(MediaFile.COVER, "ev-2") is not None


async def test_delete_one_file_of_a_visit(hass: HomeAssistant, tmp_path: Path) -> None:
    """Deleting one file keeps the other files of the visit, and its day."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.RECORDING, "ev-1", b"video")
    await _write(store, MediaFile.COVER, "ev-1", b"cover")
    await _write(store, MediaFile.COVER, "ev-2", b"cover", date(2026, 9, 25))
    assert store.visit_ids(DAY) == {"ev-1"}
    assert store.size(MediaFile.COVER, "ev-1") == 5

    await store.async_delete_visit("ev-1", [MediaFile.COVER])
    assert store.path(MediaFile.COVER, "ev-1") is None
    assert not (tmp_path / ".siipet" / "2026-09-26" / "ev-1.cover.jpg").exists()
    assert store.path(MediaFile.RECORDING, "ev-1") is not None
    assert store.visit_ids(DAY) == {"ev-1"}

    await store.async_delete_visit("ev-1", [MediaFile.RECORDING])
    assert store.visit_ids(DAY) == set()
    assert store.stats() == (1, 5)


async def test_failed_delete_is_logged_once(
    hass: HomeAssistant, tmp_path: Path, caplog: pytest.LogCaptureFixture
) -> None:
    """A file that cannot be deleted gives one warning with the error type only."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.COVER, "ev-1", b"cover")
    await _write(store, MediaFile.COVER, "ev-2", b"cover")
    with (
        caplog.at_level(logging.DEBUG, logger="custom_components.siipet"),
        patch.object(Path, "unlink", side_effect=PermissionError("denied")),
    ):
        await store.async_delete_visit("ev-1")
        await store.async_delete_visit("ev-2")
    records = [
        record
        for record in caplog.records
        if record.name == "custom_components.siipet.media_store"
    ]
    assert [record.levelno for record in records] == [logging.WARNING, logging.DEBUG]
    for record in records:
        assert "PermissionError" in record.getMessage()
        assert "ev-" not in record.getMessage()
        assert str(tmp_path) not in record.getMessage()


async def test_delete_before(hass: HomeAssistant, tmp_path: Path) -> None:
    """Day folders before the cutoff go, with their index entries."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.RECORDING, "ev-old", b"old", date(2026, 9, 19))
    await _write(store, MediaFile.RECORDING, "ev-new", b"new", date(2026, 9, 20))
    await store.async_write_avatar("pet-luna", "cats/luna.jpg", _chunks(b"a"), size=1)
    await store.async_delete_before(date(2026, 9, 20))
    root = tmp_path / ".siipet"
    assert not (root / "2026-09-19").exists()
    assert (root / "2026-09-20" / "ev-new.mp4").exists()
    assert store.path(MediaFile.RECORDING, "ev-old") is None
    assert store.path(MediaFile.RECORDING, "ev-new") is not None
    assert store.avatar_path("pet-luna", "cats/luna.jpg") is not None


async def test_delete_before_error_still_prunes_the_index(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A failing delete still drops the index entries at or before the cutoff."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.RECORDING, "ev-old", b"old", date(2026, 9, 19))
    await _write(store, MediaFile.RECORDING, "ev-new", b"new", date(2026, 9, 20))
    with (
        patch.object(store, "_delete_days_before", side_effect=OSError),
        pytest.raises(MediaStoreError),
    ):
        await store.async_delete_before(date(2026, 9, 20))
    assert store.path(MediaFile.RECORDING, "ev-old") is None
    assert store.path(MediaFile.RECORDING, "ev-new") is not None


async def test_avatar_with_a_new_key_replaces_the_old_file(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A new avatar key gives a new file, and the old file goes."""
    store = await _store(hass, tmp_path)
    await store.async_write_avatar("pet-luna", "cats/a.jpg", _chunks(b"a"), size=1)
    old = store.avatar_path("pet-luna", "cats/a.jpg")
    await store.async_write_avatar("pet-luna", "cats/b.jpg", _chunks(b"bb"), size=2)
    assert old is not None
    assert not old.exists()
    assert store.avatar_path("pet-luna", "cats/a.jpg") is None
    new = store.avatar_path("pet-luna", "cats/b.jpg")
    assert new is not None
    assert new.read_bytes() == b"bb"


async def test_prune_avatars(hass: HomeAssistant, tmp_path: Path) -> None:
    """Avatars of cats that left or changed their avatar go."""
    store = await _store(hass, tmp_path)
    await store.async_write_avatar("pet-luna", "cats/luna.jpg", _chunks(b"a"), size=1)
    await store.async_write_avatar("pet-milo", "cats/milo.jpg", _chunks(b"b"), size=1)
    await store.async_write_avatar("pet-aro", "cats/aro.jpg", _chunks(b"c"), size=1)
    await store.async_prune_avatars(
        {"pet-luna": "cats/luna.jpg", "pet-aro": "cats/aro-new.jpg"}
    )
    assert store.avatar_path("pet-luna", "cats/luna.jpg") is not None
    assert store.avatar_path("pet-milo", "cats/milo.jpg") is None
    assert store.avatar_path("pet-aro", "cats/aro.jpg") is None
    assert list((tmp_path / ".siipet" / "avatars").iterdir()) == [
        store.avatar_path("pet-luna", "cats/luna.jpg")
    ]


async def test_free_bytes(hass: HomeAssistant, tmp_path: Path) -> None:
    """The free space comes from the disk of the folder."""
    store = await _store(hass, tmp_path)
    with patch(
        "custom_components.siipet.media_store.shutil.disk_usage",
        return_value=SimpleNamespace(free=123),
    ) as usage:
        assert await store.async_free_bytes() == 123
    usage.assert_called_once_with(tmp_path / ".siipet")


async def test_delete_folder(hass: HomeAssistant, tmp_path: Path) -> None:
    """The whole folder goes, and a missing folder is not an error."""
    store = await _store(hass, tmp_path)
    await _write(store, MediaFile.RECORDING, "ev-1", b"video")
    await async_delete_folder(hass, tmp_path / ".siipet")
    assert not (tmp_path / ".siipet").exists()
    await async_delete_folder(hass, tmp_path / ".siipet")


async def test_visit_day_is_the_local_day(hass: HomeAssistant) -> None:
    """A visit belongs to the local day of its start."""
    await hass.config.async_set_time_zone("Europe/Warsaw")
    visit = Visit.from_api(
        {
            "EventId": "ev-1",
            "EventTimestamp": datetime(2026, 9, 25, 23, 30, tzinfo=UTC).timestamp()
            * 1000,
        }
    )
    assert visit_day(visit) == date(2026, 9, 26)


async def test_write_passes_source_errors_through(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """An error of the download source is not a folder error, and no partial file stays."""
    store = await _store(hass, tmp_path)

    async def failing_chunks() -> AsyncIterator[bytes]:
        yield b"ab"
        raise TimeoutError

    with pytest.raises(TimeoutError):
        await store.async_write(
            MediaFile.RECORDING,
            "ev-1",
            DAY,
            failing_chunks(),
            size=4,
            md5=None,
            keep=lambda: True,
        )
    assert store.path(MediaFile.RECORDING, "ev-1") is None
    assert list((tmp_path / ".siipet").rglob("*.*")) == []


async def test_write_cancelled_leaves_no_partial_file(
    hass: HomeAssistant, tmp_path: Path
) -> None:
    """A canceled download leaves no partial file."""
    store = await _store(hass, tmp_path)
    started = asyncio.Event()

    async def stalled_chunks() -> AsyncIterator[bytes]:
        yield b"ab"
        started.set()
        await asyncio.Event().wait()
        yield b"never"

    task = hass.async_create_task(
        store.async_write(
            MediaFile.RECORDING,
            "ev-1",
            DAY,
            stalled_chunks(),
            size=None,
            md5=None,
            keep=lambda: True,
        )
    )
    await started.wait()
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert list((tmp_path / ".siipet").rglob("*.*")) == []
