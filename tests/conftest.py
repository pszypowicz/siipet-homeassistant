"""Shared fixtures for the SiiPet tests."""

from __future__ import annotations

from collections.abc import Generator
from unittest.mock import AsyncMock, MagicMock, patch

from freezegun.api import FrozenDateTimeFactory
from homeassistant.const import CONF_EMAIL
from homeassistant.core import HomeAssistant
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.api import AbnormalLabels, Camera, Cat, Session
from custom_components.siipet.const import (
    CONF_CLIENT_ID,
    CONF_EXPIRE_AT,
    CONF_TOKEN,
    DOMAIN,
)

from .common import EMPTY_DAY, NOW, TODAY, fixture_day, load_data


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Let Home Assistant load the integration from custom_components."""


@pytest.fixture(autouse=True)
async def utc_time_zone(hass: HomeAssistant) -> None:
    """Run every test in UTC, so local days match the fixture timestamps."""
    await hass.config.async_set_time_zone("UTC")


@pytest.fixture(autouse=True)
def frozen_time(freezer: FrozenDateTimeFactory) -> FrozenDateTimeFactory:
    """Freeze time at noon on the fixture day."""
    freezer.move_to(NOW)
    return freezer


@pytest.fixture
def mock_client_class() -> Generator[MagicMock]:
    """Replace SiiPetClient in the integration and the config flow."""
    with (
        patch("custom_components.siipet.SiiPetClient", autospec=True) as client_class,
        patch("custom_components.siipet.config_flow.SiiPetClient", new=client_class),
    ):
        client = client_class.return_value
        client.get_cats.return_value = {
            cat.pet_id: cat
            for cat in (
                Cat.from_api(item) for item in load_data("pet_sync.json")["List"]
            )
        }
        client.get_cameras.return_value = {
            camera.sn: camera
            for camera in (
                Camera.from_api(item) for item in load_data("device_sync.json")["List"]
            )
        }
        day = fixture_day()
        client.get_day.side_effect = lambda requested: (
            day if requested == TODAY else EMPTY_DAY
        )
        client.get_abnormal_labels.return_value = AbnormalLabels.from_api(
            load_data("system_config.json")
        )
        login = load_data("login.json")
        client.login.return_value = Session(login["Token"], login["ExpireAt"])
        client.request_email_code.return_value = None
        yield client_class


@pytest.fixture
def mock_client(mock_client_class: MagicMock) -> AsyncMock:
    """The mocked client instance."""
    return mock_client_class.return_value


@pytest.fixture
def config_entry(hass: HomeAssistant) -> MockConfigEntry:
    """A signed-in SiiPet entry."""
    login = load_data("login.json")
    entry = MockConfigEntry(
        domain=DOMAIN,
        title="SiiPet",
        unique_id="user-0001",
        data={
            CONF_EMAIL: "cat@example.com",
            CONF_TOKEN: login["Token"],
            CONF_EXPIRE_AT: login["ExpireAt"],
            CONF_CLIENT_ID: "client-uuid-0001",
        },
    )
    entry.add_to_hass(hass)
    return entry
