"""Authenticated image proxy for SiiPet covers, stool images, and avatars."""

from __future__ import annotations

from http import HTTPStatus

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import DOMAIN
from .media import MediaKind, MediaNotFound, MediaUnavailable

IMAGE_URL = "/api/siipet/image/{kind}/{item_id}"


def image_path(kind: MediaKind, item_id: str) -> str:
    """Return the image view path of one image."""
    return IMAGE_URL.format(kind=kind, item_id=item_id)


class SiiPetImageView(HomeAssistantView):
    """Serve SiiPet images to logged-in users, so no S3 URL leaves Home Assistant."""

    url = IMAGE_URL
    name = "api:siipet:image"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        """Create the view."""
        self.hass = hass

    async def get(self, request: web.Request, kind: str, item_id: str) -> web.Response:
        """Return the JPEG bytes of one image."""
        try:
            media_kind = MediaKind(kind)
        except ValueError:
            return web.Response(status=HTTPStatus.NOT_FOUND)
        entries = self.hass.config_entries.async_loaded_entries(DOMAIN)
        if not entries:
            return web.Response(status=HTTPStatus.SERVICE_UNAVAILABLE)
        media = entries[0].runtime_data.media
        try:
            body = await media.async_fetch_image(media_kind, item_id)
        except MediaNotFound:
            return web.Response(status=HTTPStatus.NOT_FOUND)
        except MediaUnavailable:
            return web.Response(status=HTTPStatus.BAD_GATEWAY)
        return web.Response(
            body=body,
            content_type="image/jpeg",
            headers={"Cache-Control": "private, max-age=86400"},
        )
