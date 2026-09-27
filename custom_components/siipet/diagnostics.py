"""Diagnostics for the SiiPet integration."""

from __future__ import annotations

from typing import Any

from homeassistant.components.diagnostics import async_redact_data
from homeassistant.const import CONF_EMAIL
from homeassistant.core import HomeAssistant

from .const import CONF_CLIENT_ID, CONF_TOKEN, UNKNOWN_CAT_ID
from .coordinator import SiiPetConfigEntry

TO_REDACT = {
    CONF_CLIENT_ID,
    CONF_EMAIL,
    CONF_TOKEN,
    "AccessKeyId",
    "AgoraAuth",
    "Email",
    "EventId",
    "GroupId",
    "Member",
    "Owner",
    "PetId",
    "Phone",
    "S3Bucket",
    "SN",
    "SecretAccessKey",
    "SessionToken",
    "Topic",
    "Url",
    "UserId",
    "sn",
    "unique_id",
}


async def async_get_config_entry_diagnostics(
    hass: HomeAssistant, entry: SiiPetConfigEntry
) -> dict[str, Any]:
    """Return a summary of the entry with no private values."""
    coordinator = entry.runtime_data.coordinator
    data = coordinator.data
    return {
        "entry": async_redact_data(entry.as_dict(), TO_REDACT),
        "last_update_success": coordinator.last_update_success,
        "last_update": data.updated_at.isoformat(),
        "cats": len(data.cats),
        "cameras": [
            {
                "product_id": camera.product_id,
                "role": camera.role,
                "subscribed": camera.subscription_expires is not None,
            }
            for camera in data.cameras.values()
        ],
        "visits_per_day": {
            day.isoformat(): len(visits) for day, visits in sorted(data.days.items())
        },
        "unassigned_visits": len(data.visits(UNKNOWN_CAT_ID)),
        "more_pages": data.more,
        "abnormal_labels": {
            "shape": len(data.labels.shape),
            "color": len(data.labels.color),
            "event": len(data.labels.event),
        },
    }
