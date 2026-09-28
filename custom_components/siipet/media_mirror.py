"""Keep a local copy of recent SiiPet media: queue, download, check, and clean up."""

from __future__ import annotations

import asyncio
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
import logging

import aiohttp
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import issue_registry as ir
from homeassistant.helpers.event import async_track_time_change
from homeassistant.util import dt as dt_util

from .api import Visit
from .const import DOMAIN
from .coordinator import SiiPetConfigEntry, SiiPetCoordinator, SiiPetData
from .media import MediaError, SiiPetMedia
from .media_store import (
    MediaCheckFailed,
    MediaFile,
    MediaStore,
    MediaStoreError,
    safe_id,
    visit_day,
)

_LOGGER = logging.getLogger(__name__)

DOWNLOAD_TIMEOUT = aiohttp.ClientTimeout(total=None, sock_connect=30, sock_read=60)
CHUNK_SIZE = 1024 * 1024
MIN_FREE_BYTES = 1024**3
RETRY_DELAYS = (
    timedelta(minutes=5),
    timedelta(minutes=30),
    timedelta(hours=2),
    timedelta(hours=24),
)
ISSUE_DISK_FULL = "media_disk_full"
ISSUE_FOLDER = "media_folder_unavailable"
AVATAR = "avatar"
# Orders the files of one visit, small files first, so the card gets its
# images before the recording.
_RANK = {MediaFile.COVER: 2, MediaFile.STOOL: 1, MediaFile.RECORDING: 0}
_EPOCH = datetime.fromtimestamp(0, UTC)

type _JobKey = tuple[str, str]


@dataclass(frozen=True, slots=True)
class _Job:
    """One file to download. `kind` is None for a cat avatar."""

    kind: MediaFile | None
    item_id: str
    key: str
    size: int | None = None
    md5: str | None = None
    day: date | None = None
    start: datetime | None = None

    @property
    def job_key(self) -> _JobKey:
        return (self.item_id, self.kind or AVATAR)

    @property
    def label(self) -> str:
        if self.kind is None:
            return "avatar"
        if self.kind is MediaFile.RECORDING:
            return "recording"
        return f"{self.kind} image"

    @property
    def order(self) -> tuple[bool, datetime, int]:
        """Avatars first, then the newest visit, then its smaller files."""
        rank = _RANK[self.kind] if self.kind else 0
        return (self.kind is None, self.start or _EPOCH, rank)


@dataclass(frozen=True, slots=True)
class _Failure:
    """A failed job, kept so a later update can try it again."""

    job: _Job
    attempts: int
    retry_at: datetime


def _visit_jobs(visit: Visit, day: date) -> list[_Job]:
    video_key = visit.video_key if visit.cloud_stored else None
    files = (
        (MediaFile.COVER, visit.cover_key, visit.cover_size, None),
        (MediaFile.STOOL, visit.stool_key, visit.stool_size, None),
        (MediaFile.RECORDING, video_key, visit.video_size, visit.video_md5),
    )
    return [
        _Job(kind, visit.event_id, key, size, md5, day, visit.start)
        for kind, key, size, md5 in files
        if key
    ]


@callback
def async_raise_issue(hass: HomeAssistant, issue_id: str) -> None:
    """Show a repair issue of the local media copy."""
    ir.async_create_issue(
        hass,
        DOMAIN,
        issue_id,
        is_fixable=False,
        severity=ir.IssueSeverity.WARNING,
        translation_key=issue_id,
    )


@callback
def async_clear_issues(hass: HomeAssistant) -> None:
    """Remove the repair issues of the local media copy."""
    for issue_id in (ISSUE_DISK_FULL, ISSUE_FOLDER):
        ir.async_delete_issue(hass, DOMAIN, issue_id)


class SiiPetMirror:
    """Copy the media of the last `days` days into the store, one file at a time.

    A worker task runs while files wait, and a new update starts it again.
    """

    def __init__(
        self,
        hass: HomeAssistant,
        entry: SiiPetConfigEntry,
        coordinator: SiiPetCoordinator,
        media: SiiPetMedia,
        store: MediaStore,
        days: int,
    ) -> None:
        """Create the mirror of one entry. Call `async_start` to run it."""
        self.hass = hass
        self.entry = entry
        self.coordinator = coordinator
        self.media = media
        self.store = store
        self.days = days
        self._pending: dict[_JobKey, _Job] = {}
        self._failures: dict[_JobKey, _Failure] = {}
        self._worker: asyncio.Task[None] | None = None
        self._stopped = False
        self._disk_full = False
        self._active: _JobKey | None = None
        self._forgotten: set[str] = set()

    async def async_start(self) -> None:
        """Clean up, queue the missing media, and start the downloads."""
        await self._async_cleanup()
        self.entry.async_on_unload(self._async_unload)
        self.entry.async_on_unload(
            self.coordinator.async_add_listener(self._async_on_update)
        )
        self.entry.async_on_unload(
            async_track_time_change(
                self.hass, self._async_daily_trigger, hour=0, minute=5, second=0
            )
        )
        self._queue_data(self.coordinator.data)
        self.entry.async_create_background_task(
            self.hass, self._async_backfill(), "siipet media backfill"
        )

    @callback
    def _async_unload(self) -> None:
        """Stop queueing new downloads. The entry cancels the background tasks."""
        self._stopped = True
        self._pending.clear()

    @callback
    def async_forget(self, event_id: str) -> None:
        """Drop the waiting downloads of a visit, and delete its files."""
        for job_key in [job_key for job_key in self._pending if job_key[0] == event_id]:
            del self._pending[job_key]
        self._failures = {
            job_key: failure
            for job_key, failure in self._failures.items()
            if job_key[0] != event_id
        }
        if self._active is not None and self._active[0] == event_id:
            # The active download commits after this method returns, so make
            # its `keep` callback drop the file instead of storing it.
            self._forgotten.add(event_id)
        self.entry.async_create_background_task(
            self.hass, self.store.async_delete_visit(event_id), "siipet media delete"
        )

    def stats(self) -> dict[str, int]:
        """Return the numbers of waiting and failing downloads."""
        return {"queued": len(self._pending), "failing": len(self._failures)}

    def _in_window(self, day: date) -> bool:
        today = dt_util.now().date()
        return today - timedelta(days=self.days - 1) <= day <= today

    @callback
    def _async_on_update(self) -> None:
        self._queue_data(self.coordinator.data)

    def _queue_data(self, data: SiiPetData) -> None:
        self._retry_failures()
        for cat in data.cats.values():
            if (
                cat.avatar_key
                and self.store.avatar_path(cat.pet_id, cat.avatar_key) is None
            ):
                self._add(_Job(None, cat.pet_id, cat.avatar_key))
        for visits in data.days.values():
            self._queue_visits(visits)
        self._kick()

    def _queue_visits(self, visits: Iterable[Visit]) -> None:
        for visit in visits:
            day = visit_day(visit)
            if not self._in_window(day):
                continue
            for job in _visit_jobs(visit, day):
                assert job.kind is not None
                if self.store.path(job.kind, job.item_id) is None:
                    self._add(job)

    def _retry_failures(self) -> None:
        """Add again the failed jobs whose wait is over and that are still due."""
        now = dt_util.utcnow()
        for failure in list(self._failures.values()):
            if failure.retry_at <= now and not self._should_skip(failure.job):
                self._add(failure.job)

    def _should_skip(self, job: _Job) -> bool:
        """True when a job's file is already stored, or its day left the window."""
        if job.day is not None and not self._in_window(job.day):
            return True
        return self._is_stored(job)

    def _is_stored(self, job: _Job) -> bool:
        if job.kind is None:
            return self.store.avatar_path(job.item_id, job.key) is not None
        return self.store.path(job.kind, job.item_id) is not None

    def _add(self, job: _Job) -> None:
        if self._stopped or not safe_id(job.item_id) or job.job_key == self._active:
            return
        failure = self._failures.get(job.job_key)
        if failure and failure.retry_at > dt_util.utcnow():
            return
        self._pending.setdefault(job.job_key, job)

    @callback
    def _kick(self) -> None:
        if self._stopped or not self._pending:
            return
        if self._worker is None or self._worker.done():
            self._worker = self.entry.async_create_background_task(
                self.hass, self._async_run(), "siipet media downloads"
            )

    def _next_job(self) -> _Job | None:
        while self._pending:
            job = max(self._pending.values(), key=lambda job: job.order)
            del self._pending[job.job_key]
            if self._should_skip(job):
                continue
            self._active = job.job_key
            return job
        return None

    async def _async_run(self) -> None:
        while (job := self._next_job()) is not None:
            try:
                if not await self._async_has_room(job):
                    self._pending.clear()
                    return
                await self._async_download(job)
            finally:
                self._active = None
                self._forgotten.discard(job.item_id)

    async def _async_has_room(self, job: _Job) -> bool:
        try:
            free = await self.store.async_free_bytes()
        except MediaStoreError as err:
            self._stop(err)
            return False
        if free - (job.size or 0) < MIN_FREE_BYTES:
            if not self._disk_full:
                _LOGGER.warning("SiiPet paused the local media copy: the disk is full")
                self._disk_full = True
            async_raise_issue(self.hass, ISSUE_DISK_FULL)
            return False
        if self._disk_full:
            self._disk_full = False
            ir.async_delete_issue(self.hass, DOMAIN, ISSUE_DISK_FULL)
        return True

    async def _async_download(self, job: _Job) -> None:
        try:
            async with self.media.async_open(
                job.key, job.label, DOWNLOAD_TIMEOUT
            ) as response:
                chunks = response.content.iter_chunked(CHUNK_SIZE)
                if job.kind is None:
                    await self.store.async_write_avatar(
                        job.item_id, job.key, chunks, size=job.size
                    )
                else:
                    day = job.day
                    assert day is not None
                    await self.store.async_write(
                        job.kind,
                        job.item_id,
                        day,
                        chunks,
                        size=job.size,
                        md5=job.md5,
                        keep=lambda: (
                            self._in_window(day) and job.item_id not in self._forgotten
                        ),
                    )
        except MediaStoreError as err:
            self._stop(err)
        except (MediaError, MediaCheckFailed) as err:
            self._fail(job, err)
        except Exception as err:
            # A download error of an unknown shape must not end the worker,
            # and its message can hold anything, so only its type is logged.
            self._record_failure(job)
            _LOGGER.error(
                "The local media copy hit an unexpected error (%s)",
                type(err).__name__,
            )
            _LOGGER.debug("Unexpected SiiPet media download error", exc_info=True)
        else:
            self._failures.pop(job.job_key, None)

    def _record_failure(self, job: _Job) -> None:
        failure = self._failures.get(job.job_key)
        attempts = failure.attempts + 1 if failure else 1
        delay = RETRY_DELAYS[min(attempts, len(RETRY_DELAYS)) - 1]
        self._failures[job.job_key] = _Failure(job, attempts, dt_util.utcnow() + delay)

    def _fail(self, job: _Job, err: Exception) -> None:
        self._record_failure(job)
        _LOGGER.debug("A SiiPet %s download failed: %s", job.label, err)

    def _stop(self, err: MediaStoreError) -> None:
        _LOGGER.warning("SiiPet stopped the local media copy: %s", err)
        self._stopped = True
        self._pending.clear()
        async_raise_issue(self.hass, ISSUE_FOLDER)

    async def _async_backfill(self) -> None:
        """Queue the missing media of every day in the window."""
        today = dt_util.now().date()
        for offset in range(self.days):
            if self._stopped:
                return
            try:
                visits = await self.media.async_day_visits(
                    today - timedelta(days=offset)
                )
            except MediaError as err:
                _LOGGER.debug("SiiPet skipped a day of the local media copy: %s", err)
                continue
            self._queue_visits(visits)
            self._kick()

    @callback
    def _async_daily_trigger(self, now: datetime) -> None:
        self.entry.async_create_background_task(
            self.hass, self._async_daily(), "siipet media daily"
        )

    async def _async_daily(self) -> None:
        await self._async_cleanup()
        await self._async_backfill()

    async def _async_cleanup(self) -> None:
        cutoff = dt_util.now().date() - timedelta(days=self.days - 1)
        try:
            await self.store.async_delete_before(cutoff)
            await self.store.async_prune_avatars(
                {
                    cat.pet_id: cat.avatar_key
                    for cat in self.coordinator.data.cats.values()
                }
            )
        except MediaStoreError as err:
            self._stop(err)
            return
        self._failures = {
            job_key: failure
            for job_key, failure in self._failures.items()
            if failure.job.day is None or failure.job.day >= cutoff
        }
        self._pending = {
            job_key: job
            for job_key, job in self._pending.items()
            if job.day is None or job.day >= cutoff
        }
