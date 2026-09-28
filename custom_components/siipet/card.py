"""Serve the dashboard card and load it on every dashboard."""

from __future__ import annotations

import hashlib
import logging
from pathlib import Path

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)

CARD_FILE = Path(__file__).parent / "frontend" / "siipet-visits-card.js"
CARD_PATH = "/siipet/siipet-visits-card.js"


def _file_version(path: Path) -> str:
    """Return the first 8 hex characters of the SHA-256 of the file."""
    return hashlib.sha256(path.read_bytes()).hexdigest()[:8]


async def async_register_card(hass: HomeAssistant) -> None:
    """Serve the card file, and add it to the frontend with a version of its content.

    A new build gets a new URL, so browsers load it without a version bump.
    Without the file, the card is not registered, and the rest of the setup goes on.
    """
    try:
        version = await hass.async_add_executor_job(_file_version, CARD_FILE)
    except OSError:
        _LOGGER.warning(
            "The SiiPet card file is missing, so dashboards do not load the card"
        )
        return
    await hass.http.async_register_static_paths(
        [StaticPathConfig(CARD_PATH, str(CARD_FILE), cache_headers=True)]
    )
    # Without the frontend, for example in a setup with no user interface, no page loads it.
    if "frontend" in hass.config.components:
        add_extra_js_url(hass, f"{CARD_PATH}?v={version}")
