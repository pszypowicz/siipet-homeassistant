"""Local copies of SiiPet media in a hidden folder of the Home Assistant media folder."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterable, Callable, Mapping
from datetime import date
from enum import StrEnum
from functools import partial
import hashlib
import logging
from pathlib import Path
import re
import shutil
from typing import Any, BinaryIO

from homeassistant.core import HomeAssistant
from homeassistant.util import dt as dt_util

from .api import Visit
from .const import MEDIA_FOLDER

_LOGGER = logging.getLogger(__name__)

AVATAR_FOLDER = "avatars"
PART_SUFFIX = ".part"
_SAFE_ID = re.compile(r"[A-Za-z0-9_-]+")


class MediaFile(StrEnum):
    """The files that the store keeps for a visit."""

    RECORDING = "recording"
    COVER = "cover"
    STOOL = "stool"


SUFFIXES = {
    MediaFile.RECORDING: ".mp4",
    MediaFile.COVER: ".cover.jpg",
    MediaFile.STOOL: ".stool.jpg",
}


class MediaStoreError(Exception):
    """The media folder cannot be read or written. Messages name no path."""


class MediaCheckFailed(Exception):
    """A download does not match its expected size or MD5."""


def safe_id(value: str) -> bool:
    """Return True when an id can be part of a file name."""
    return _SAFE_ID.fullmatch(value) is not None


def visit_day(visit: Visit) -> date:
    """Return the local day whose folder holds the files of a visit."""
    return dt_util.as_local(visit.start).date()


def key_hash(key: str) -> str:
    """Return a short hash of a media key, for the name of an avatar file."""
    return hashlib.sha256(key.encode()).hexdigest()[:12]


def media_root(hass: HomeAssistant) -> Path | None:
    """Return the folder of the local copy, or None without a local media folder."""
    local = hass.config.media_dirs.get("local")
    return Path(local) / MEDIA_FOLDER if local else None


async def async_delete_folder(hass: HomeAssistant, root: Path) -> None:
    """Delete the media folder of the integration, if it exists."""
    await hass.async_add_executor_job(partial(shutil.rmtree, root, ignore_errors=True))


def _parse_day(name: str) -> date | None:
    try:
        return date.fromisoformat(name)
    except ValueError:
        return None


def _open_part(part: Path) -> BinaryIO:
    part.parent.mkdir(parents=True, exist_ok=True)
    return part.open("wb")


type _Entry = tuple[Path, int]


class MediaStore:
    """Keep verified media files in day folders, and index them by id.

    One lock covers each write from the first byte to the rename, and each
    cleanup, so a cleanup never runs while a file is half written. The delete
    of a visit does not take the lock.
    """

    def __init__(self, hass: HomeAssistant, root: Path) -> None:
        """Create a store for the folder `root`. Call `async_load` before use."""
        self.hass = hass
        self.root = root
        self._files: dict[str, dict[MediaFile, _Entry]] = {}
        self._avatars: dict[str, tuple[str, Path, int]] = {}
        self._lock = asyncio.Lock()
        self._unlink_warned = False

    async def async_load(self) -> None:
        """Create the folder, delete partial files, and index the complete ones."""
        try:
            self._files, self._avatars = await self.hass.async_add_executor_job(
                self._scan
            )
        except OSError as err:
            raise MediaStoreError(
                f"Cannot read the media folder ({type(err).__name__})"
            ) from None

    def path(self, kind: MediaFile, event_id: str) -> Path | None:
        """Return the path of a stored visit file, or None."""
        entry = self._files.get(event_id, {}).get(kind)
        return entry[0] if entry else None

    def avatar_path(self, pet_id: str, key: str) -> Path | None:
        """Return the path of a stored avatar for its current key, or None."""
        entry = self._avatars.get(pet_id)
        return entry[1] if entry and entry[0] == key_hash(key) else None

    def stats(self) -> tuple[int, int]:
        """Return the number of stored files and their total size in bytes."""
        sizes = [size for files in self._files.values() for _, size in files.values()]
        sizes += [size for _, _, size in self._avatars.values()]
        return len(sizes), sum(sizes)

    async def async_write(
        self,
        kind: MediaFile,
        event_id: str,
        day: date,
        chunks: AsyncIterable[bytes],
        *,
        size: int | None,
        md5: str | None,
        keep: Callable[[], bool],
    ) -> bool:
        """Store a visit file from its download.

        Return False, with nothing stored, when `keep` is False just before or
        just after the rename.
        """
        if not safe_id(event_id):
            raise MediaStoreError("The visit id cannot be a file name")
        target = self.root / day.isoformat() / f"{event_id}{SUFFIXES[kind]}"
        async with self._lock:
            written = await self._async_receive(target, chunks, size=size, md5=md5)
            if not keep():
                await self._async_unlink(_part(target))
                return False
            await self._async_commit(target)
            if not keep():
                # A delete of the visit does not wait for the lock, so it can
                # come during the rename.
                await self._async_unlink(target)
                return False
            self._files.setdefault(event_id, {})[kind] = (target, written)
        return True

    async def async_write_avatar(
        self,
        pet_id: str,
        key: str,
        chunks: AsyncIterable[bytes],
        *,
        size: int | None,
    ) -> None:
        """Store the avatar of a cat, and delete its avatar for an older key."""
        if not safe_id(pet_id):
            raise MediaStoreError("The cat id cannot be a file name")
        digest = key_hash(key)
        target = self.root / AVATAR_FOLDER / f"{pet_id}.{digest}.jpg"
        async with self._lock:
            written = await self._async_receive(target, chunks, size=size, md5=None)
            await self._async_commit(target)
            old = self._avatars.get(pet_id)
            self._avatars[pet_id] = (digest, target, written)
            if old and old[1] != target:
                await self._async_unlink(old[1])

    async def async_delete_visit(self, event_id: str) -> None:
        """Delete the files of a visit, without waiting for a running download.

        The index drops the files at once, and the caller keeps a running
        download of the same visit from storing its file.
        """
        for path, _ in self._files.pop(event_id, {}).values():
            await self._async_unlink(path)

    async def async_delete_before(self, day: date) -> None:
        """Delete the day folders before `day`, with their index entries.

        The index is pruned even when the delete fails.
        """
        async with self._lock:
            try:
                await self.hass.async_add_executor_job(self._delete_days_before, day)
            except OSError as err:
                raise MediaStoreError(
                    f"Cannot delete a media folder ({type(err).__name__})"
                ) from None
            finally:
                files: dict[str, dict[MediaFile, _Entry]] = {}
                for event_id, entries in self._files.items():
                    kept = {
                        kind: entry
                        for kind, entry in entries.items()
                        if (_parse_day(entry[0].parent.name) or day) >= day
                    }
                    if kept:
                        files[event_id] = kept
                self._files = files

    async def async_prune_avatars(self, current: Mapping[str, str | None]) -> None:
        """Delete the avatars of cats that left the account or changed their avatar."""
        async with self._lock:
            for pet_id, (digest, path, _) in list(self._avatars.items()):
                key = current.get(pet_id)
                if key is None or key_hash(key) != digest:
                    del self._avatars[pet_id]
                    await self._async_unlink(path)

    async def async_free_bytes(self) -> int:
        """Return the free space on the disk of the folder."""
        try:
            usage = await self.hass.async_add_executor_job(shutil.disk_usage, self.root)
        except OSError as err:
            raise MediaStoreError(
                f"Cannot read the free space ({type(err).__name__})"
            ) from None
        return usage.free

    async def _async_receive(
        self,
        target: Path,
        chunks: AsyncIterable[bytes],
        *,
        size: int | None,
        md5: str | None,
    ) -> int:
        """Write the chunks to the partial file of `target` and check them.

        Only file errors become MediaStoreError. An error of the chunk source,
        for example a network timeout, passes through.
        """
        part = _part(target)
        digest = hashlib.md5()
        written = 0
        try:
            handle = await self._async_file_op(_open_part, part)
            try:
                async for chunk in chunks:
                    digest.update(chunk)
                    written += len(chunk)
                    await self._async_file_op(handle.write, chunk)
            finally:
                await self._async_file_op(handle.close)
        except BaseException:
            # Also on cancellation, so that no partial file stays behind.
            await self._async_unlink(part)
            raise
        if (
            written == 0
            or (size is not None and written != size)
            or (md5 is not None and digest.hexdigest() != md5)
        ):
            await self._async_unlink(part)
            raise MediaCheckFailed("The download does not match its size or hash")
        return written

    async def _async_commit(self, target: Path) -> None:
        part = _part(target)
        try:
            await self.hass.async_add_executor_job(part.replace, target)
        except OSError as err:
            await self._async_unlink(part)
            raise MediaStoreError(
                f"Cannot store a media file ({type(err).__name__})"
            ) from None

    async def _async_file_op[T](self, func: Callable[..., T], *args: Any) -> T:
        """Run a file operation in the executor. A file error becomes MediaStoreError."""
        try:
            return await self.hass.async_add_executor_job(func, *args)
        except OSError as err:
            raise MediaStoreError(
                f"Cannot write a media file ({type(err).__name__})"
            ) from None

    async def _async_unlink(self, path: Path) -> None:
        try:
            await self.hass.async_add_executor_job(
                partial(path.unlink, missing_ok=True)
            )
        except OSError as err:
            level = logging.DEBUG if self._unlink_warned else logging.WARNING
            self._unlink_warned = True
            _LOGGER.log(
                level,
                "SiiPet could not delete a local media file (%s)",
                type(err).__name__,
            )

    def _scan(
        self,
    ) -> tuple[dict[str, dict[MediaFile, _Entry]], dict[str, tuple[str, Path, int]]]:
        self.root.mkdir(parents=True, exist_ok=True)
        files: dict[str, dict[MediaFile, _Entry]] = {}
        avatars: dict[str, tuple[str, Path, int]] = {}
        for folder in self.root.iterdir():
            if not folder.is_dir():
                continue
            is_avatars = folder.name == AVATAR_FOLDER
            if not is_avatars and _parse_day(folder.name) is None:
                continue
            for path in folder.iterdir():
                if path.name.endswith(PART_SUFFIX):
                    path.unlink(missing_ok=True)
                elif is_avatars:
                    pet_id, _, rest = path.name.partition(".")
                    digest = rest.removesuffix(".jpg")
                    if safe_id(pet_id) and rest.endswith(".jpg"):
                        avatars[pet_id] = (digest, path, path.stat().st_size)
                else:
                    for kind, suffix in SUFFIXES.items():
                        event_id = path.name.removesuffix(suffix)
                        if path.name.endswith(suffix) and safe_id(event_id):
                            files.setdefault(event_id, {})[kind] = (
                                path,
                                path.stat().st_size,
                            )
                            break
        return files, avatars

    def _delete_days_before(self, day: date) -> None:
        if not self.root.is_dir():
            return
        for folder in self.root.iterdir():
            folder_day = _parse_day(folder.name)
            if folder_day is not None and folder_day < day and folder.is_dir():
                shutil.rmtree(folder, ignore_errors=True)


def _part(target: Path) -> Path:
    return target.with_name(target.name + PART_SUFFIX)
