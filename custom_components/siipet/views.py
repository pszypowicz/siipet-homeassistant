"""Authenticated image proxy for SiiPet covers, stool images, and avatars."""

from __future__ import annotations

from http import HTTPStatus
import logging

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .media import RECORDING_URL, MediaKind, MediaNotFound, MediaUnavailable

_LOGGER = logging.getLogger(__name__)

IMAGE_URL = "/api/siipet/image/{kind}/{item_id}"
IMAGE_CACHE = "private, max-age=86400"
RECORDING_CACHE = "private, max-age=3600"


def image_path(kind: MediaKind, item_id: str) -> str:
    """Return the image view path of one image."""
    return IMAGE_URL.format(kind=kind, item_id=item_id)


class SiiPetImageView(HomeAssistantView):
    """Serve SiiPet images to logged-in users, so that image URLs stay inside Home Assistant."""

    url = IMAGE_URL
    name = "api:siipet:image"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        """Create the view."""
        self.hass = hass

    async def get(
        self, request: web.Request, kind: str, item_id: str
    ) -> web.StreamResponse:
        """Return the JPEG bytes of one image."""
        try:
            media_kind = MediaKind(kind)
        except ValueError:
            return web.Response(status=HTTPStatus.NOT_FOUND)
        entries = self.hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            return web.Response(status=HTTPStatus.SERVICE_UNAVAILABLE)
        media = entries[0].runtime_data.media
        if (path := media.local_image(media_kind, item_id)) is not None:
            return web.FileResponse(path, headers={"Cache-Control": IMAGE_CACHE})
        try:
            body = await media.async_fetch_image(media_kind, item_id)
        except MediaNotFound as err:
            _LOGGER.debug("SiiPet image request failed: %s", err)
            return web.Response(status=HTTPStatus.NOT_FOUND)
        except MediaUnavailable as err:
            _LOGGER.debug("SiiPet image request failed: %s", err)
            return web.Response(status=HTTPStatus.BAD_GATEWAY)
        return web.Response(
            body=body,
            content_type="image/jpeg",
            headers={"Cache-Control": IMAGE_CACHE},
        )


class SiiPetRecordingView(HomeAssistantView):
    """Serve recordings from the local copy to logged-in users, with range requests."""

    url = RECORDING_URL
    name = "api:siipet:recording"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        """Create the view."""
        self.hass = hass

    async def get(self, request: web.Request, event_id: str) -> web.StreamResponse:
        """Return the stored MP4 recording of a visit."""
        entries = self.hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            return web.Response(status=HTTPStatus.SERVICE_UNAVAILABLE)
        path = entries[0].runtime_data.media.local_recording(event_id)
        if path is None:
            return web.Response(status=HTTPStatus.NOT_FOUND)
        return web.FileResponse(path, headers={"Cache-Control": RECORDING_CACHE})
