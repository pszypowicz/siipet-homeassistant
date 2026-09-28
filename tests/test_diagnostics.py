"""Tests for the SiiPet diagnostics."""

from __future__ import annotations

import json
from unittest.mock import AsyncMock

from homeassistant.components.diagnostics import REDACTED
from homeassistant.const import CONF_EMAIL
from homeassistant.core import HomeAssistant
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.siipet.const import (
    CONF_AUTH_METHOD,
    CONF_CLIENT_ID,
    CONF_EXPIRE_AT,
    CONF_TOKEN,
)
from custom_components.siipet.diagnostics import (
    TO_REDACT,
    async_get_config_entry_diagnostics,
)

from .common import load_data, setup_integration


async def test_diagnostics(
    hass: HomeAssistant, mock_client: AsyncMock, config_entry: MockConfigEntry
) -> None:
    """Diagnostics summarize the account and contain no private values."""
    await setup_integration(hass, config_entry)
    result = await async_get_config_entry_diagnostics(hass, config_entry)

    assert result["last_update_success"] is True
    assert result["last_update"] == "2026-09-26T12:00:00+00:00"
    assert result["cats"] == 2
    assert result["cameras"][0] == {
        "product_id": "JOY1",
        "role": 1,
        "subscribed": True,
    }
    assert result["visits_per_day"]["2026-09-26"] == 6
    assert result["unassigned_visits"] == 1
    assert result["abnormal_labels"] == {"shape": 2, "color": 1, "event": 1}

    entry = result["entry"]
    assert entry["unique_id"] == REDACTED
    assert entry["data"] == {
        CONF_AUTH_METHOD: "email",
        CONF_EMAIL: REDACTED,
        CONF_TOKEN: REDACTED,
        CONF_EXPIRE_AT: config_entry.data[CONF_EXPIRE_AT],
        CONF_CLIENT_ID: REDACTED,
    }

    # Also guards the ids that the summary does not include.
    text = json.dumps(result, default=str)
    for private in (
        load_data("login.json")["Token"],
        "cat@example.com",
        "client-uuid-0001",
        "user-0001",
        "SN0001",
        "pet-luna",
        "group-0001",
        "ev-1",
    ):
        assert private not in text


def test_media_credential_keys_are_redacted() -> None:
    """The media credential keys are on the redaction list."""
    assert {"AccessKeyId", "SecretAccessKey", "SessionToken", "S3Bucket"} <= TO_REDACT
