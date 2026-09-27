"""Media lookup and access for SiiPet recordings and images."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from enum import StrEnum

import aiohttp
from homeassistant.core import HomeAssistant
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.util import dt as dt_util

from .api import SiiPetApiError, SiiPetClient, SiiPetError, Visit
from .api.s3 import S3Signer
from .coordinator import SiiPetCoordinator

VIDEO_URL_LIFETIME = timedelta(hours=1)
IMAGE_URL_LIFETIME = timedelta(minutes=5)
OLDER_DAY_CACHE = timedelta(minutes=5)
IMAGE_TIMEOUT = aiohttp.ClientTimeout(total=30)


class MediaKind(StrEnum):
    """The image kinds that the image view serves."""

    COVER = "cover"
    STOOL = "stool"
    AVATAR = "avatar"


class MediaError(Exception):
    """Base class for media errors. Messages name no URL, key, or credential."""


class MediaNotFound(MediaError):
    """The visit, the cat, or its media does not exist."""


class MediaUnavailable(MediaError):
    """The SiiPet API or S3 failed."""


class SiiPetMedia:
    """Find media keys, sign recording URLs, and fetch images."""

    def __init__(
        self,
        hass: HomeAssistant,
        coordinator: SiiPetCoordinator,
        client: SiiPetClient,
        signer: S3Signer,
    ) -> None:
        """Create the media helper for one config entry."""
        self.hass = hass
        self.coordinator = coordinator
        self.client = client
        self.signer = signer
        self._older_days: dict[date, tuple[datetime, tuple[Visit, ...]]] = {}

    async def async_day_visits(self, day: date) -> tuple[Visit, ...]:
        """Return the visits of a local day, newest first."""
        data = self.coordinator.data
        if day in data.days:
            visits = data.days[day]
        elif day > data.today:
            visits = ()
        else:
            visits = await self._async_older_day(day)
        return tuple(sorted(visits, key=lambda visit: visit.start, reverse=True))

    async def async_visit(self, event_id: str) -> Visit:
        """Return a visit from the window, the older-day cache, or the API."""
        known = [
            *self.coordinator.data.days.values(),
            *(visits for _read_at, visits in self._older_days.values()),
        ]
        for visits in known:
            for visit in visits:
                if visit.event_id == event_id:
                    return visit
        try:
            return await self.client.get_visit(event_id)
        except SiiPetApiError as err:
            raise MediaNotFound("The visit does not exist") from err
        except SiiPetError as err:
            raise MediaUnavailable("Could not read the visit") from err

    async def async_video_url(self, event_id: str) -> str:
        """Return a signed URL of the recording of a visit."""
        visit = await self.async_visit(event_id)
        if not visit.cloud_stored:
            raise MediaNotFound("The recording is only on the camera")
        if not visit.video_key:
            raise MediaNotFound("The visit has no recording")
        return await self._async_presign(visit.video_key, VIDEO_URL_LIFETIME)

    async def async_image_key(self, kind: MediaKind, item_id: str) -> str:
        """Return the bucket key of a cover, a stool image, or a cat avatar."""
        if kind is MediaKind.AVATAR:
            cat = self.coordinator.data.cats.get(item_id)
            key = cat.avatar_key if cat else None
        else:
            visit = await self.async_visit(item_id)
            key = visit.cover_key if kind is MediaKind.COVER else visit.stool_key
        if not key:
            raise MediaNotFound(f"No {kind} image")
        return key

    async def async_fetch_image(self, kind: MediaKind, item_id: str) -> bytes:
        """Fetch an image from S3 on the server and return its bytes."""
        key = await self.async_image_key(kind, item_id)
        session = async_get_clientsession(self.hass)
        for attempt in range(2):
            url = await self._async_presign(key, IMAGE_URL_LIFETIME)
            try:
                async with session.get(url, timeout=IMAGE_TIMEOUT) as response:
                    if response.status == 403 and attempt == 0:
                        # The credentials can end before their expiry time.
                        self.signer.invalidate()
                        continue
                    if response.status == 404:
                        raise MediaNotFound(f"No {kind} image")
                    if response.status != 200:
                        raise MediaUnavailable(f"S3 returned HTTP {response.status}")
                    return await response.read()
            except (TimeoutError, aiohttp.ClientError) as err:
                raise MediaUnavailable(
                    f"Could not fetch the {kind} image ({type(err).__name__})"
                ) from None
        raise MediaUnavailable("S3 returned HTTP 403")

    async def _async_presign(self, key: str, lifetime: timedelta) -> str:
        try:
            return await self.signer.async_presign(key, lifetime)
        except SiiPetError as err:
            raise MediaUnavailable("Could not get the media credentials") from err

    async def _async_older_day(self, day: date) -> tuple[Visit, ...]:
        now = dt_util.utcnow()
        self._older_days = {
            cached_day: cached
            for cached_day, cached in self._older_days.items()
            if now - cached[0] < OLDER_DAY_CACHE
        }
        if day in self._older_days:
            return self._older_days[day][1]
        try:
            visits = (await self.client.get_day(day)).visits
        except SiiPetError as err:
            raise MediaUnavailable("Could not read the visits of the day") from err
        self._older_days[day] = (now, visits)
        return visits
