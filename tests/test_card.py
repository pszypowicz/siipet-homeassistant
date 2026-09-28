"""Tests for the serving of the dashboard card."""

from __future__ import annotations

from collections.abc import Generator
import hashlib
from http import HTTPStatus
from unittest.mock import MagicMock, patch

from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component
import pytest
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from custom_components.siipet.card import CARD_FILE
from custom_components.siipet.const import DOMAIN


@pytest.fixture
def add_extra_js_url() -> Generator[MagicMock]:
    """Replace the frontend call that adds a module to every page."""
    with patch("custom_components.siipet.card.add_extra_js_url") as add_url:
        yield add_url


async def test_card_is_served_with_a_content_version(
    hass: HomeAssistant,
    hass_client_no_auth: ClientSessionGenerator,
    add_extra_js_url: MagicMock,
) -> None:
    """The card file is public, and its URL changes with its content."""
    hass.config.components.add("frontend")
    assert await async_setup_component(hass, DOMAIN, {})

    version = hashlib.sha256(CARD_FILE.read_bytes()).hexdigest()[:8]
    add_extra_js_url.assert_called_once_with(
        hass, f"/siipet/siipet-visits-card.js?v={version}"
    )
    client = await hass_client_no_auth()
    response = await client.get("/siipet/siipet-visits-card.js")
    assert response.status == HTTPStatus.OK
    assert await response.read() == CARD_FILE.read_bytes()


async def test_card_is_not_added_without_the_frontend(
    hass: HomeAssistant, add_extra_js_url: MagicMock
) -> None:
    """A setup without the frontend serves the file but adds it to no page."""
    assert await async_setup_component(hass, DOMAIN, {})
    add_extra_js_url.assert_not_called()
