"""Visit and cat data shared by the actions and the websocket commands."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import area_registry as ar, device_registry as dr
from homeassistant.util import dt as dt_util

from .api import SiiPetAuthError, Visit
from .const import DOMAIN, UNKNOWN_CAT_ID
from .coordinator import SiiPetConfigEntry, SiiPetData
from .media import MediaError

# The day list keeps today and the 30 days before it.
HISTORY_DAYS = 30


def loaded_entry(hass: HomeAssistant) -> SiiPetConfigEntry:
    """Return the loaded SiiPet entry, or raise the translated not_loaded error."""
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="not_loaded"
        )
    return entries[0]


def cat_id(
    hass: HomeAssistant,
    entry: SiiPetConfigEntry,
    device_id: str,
    *,
    allow_unknown: bool,
) -> str:
    """Return the pet id of a cat device, or UNKNOWN_CAT_ID for the Unknown cat."""
    device = dr.async_get(hass).async_get(device_id)
    cats = entry.runtime_data.coordinator.data.cats
    if device is not None and entry.entry_id in device.config_entries:
        for domain, identifier in device.identifiers:
            if domain != DOMAIN:
                continue
            if identifier in cats or (allow_unknown and identifier == UNKNOWN_CAT_ID):
                return identifier
    raise ServiceValidationError(
        translation_domain=DOMAIN, translation_key="invalid_cat"
    )


def device_ids(hass: HomeAssistant, entry: SiiPetConfigEntry) -> dict[str, str]:
    """Map pet ids and UNKNOWN_CAT_ID to their device ids."""
    registry = dr.async_get(hass)
    ids: dict[str, str] = {}
    for owner in (*entry.runtime_data.coordinator.data.cats, UNKNOWN_CAT_ID):
        device = registry.async_get_device_by_identifier(
            (DOMAIN, owner), entry.entry_id
        )
        if device is not None:
            ids[owner] = device.id
    return ids


def camera_labels(hass: HomeAssistant, entry: SiiPetConfigEntry) -> dict[str, str]:
    """Map serial numbers to the area of the camera device, else to the device name.

    A camera without a device takes its SiiPet name. The map is empty when
    the account has fewer than two cameras.
    """
    cameras = entry.runtime_data.coordinator.data.cameras
    if len(cameras) < 2:
        return {}
    devices = dr.async_get(hass)
    areas = ar.async_get(hass)
    labels: dict[str, str] = {}
    for sn, camera in cameras.items():
        device = devices.async_get_device_by_identifier((DOMAIN, sn), entry.entry_id)
        if device is None:
            labels[sn] = camera.name
            continue
        area = areas.async_get_area(device.area_id) if device.area_id else None
        labels[sn] = (
            area.name if area else device.name_by_user or device.name or camera.name
        )
    return labels


def visit_dict(
    data: SiiPetData, devices: dict[str, str], visit: Visit
) -> dict[str, Any]:
    """Return a visit without serial numbers, pet ids, or media keys."""
    camera = data.cameras.get(visit.sn)
    return {
        "event_id": visit.event_id,
        "start": dt_util.as_local(visit.start).isoformat(),
        "duration": round(visit.duration_ms / 1000),
        "type": visit.type.key,
        "cats": [
            {"device_id": devices.get(owner), "name": data.cats[owner].name}
            for owner in data.cat_ids(visit)
            if owner in data.cats
        ],
        "camera": camera.name if camera else None,
        "note": visit.note,
        "abnormal": visit.abnormal,
        "abnormal_reasons": data.labels.reasons(visit),
        "has_video": visit.cloud_stored and visit.video_key is not None,
        "has_stool_image": visit.stool_key is not None,
    }


def check_history_day(data: SiiPetData, day: date) -> None:
    """Raise date_out_of_range unless `day` is today or one of the 30 days before it."""
    first = data.today - timedelta(days=HISTORY_DAYS)
    if not first <= day <= data.today:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="date_out_of_range",
            translation_placeholders={
                "first": first.isoformat(),
                "last": data.today.isoformat(),
            },
        )


async def async_read_day(
    hass: HomeAssistant, entry: SiiPetConfigEntry, day: date
) -> tuple[Visit, ...]:
    """Return the visits of a day, newest first, or raise request_failed.

    An auth error also starts reauth.
    """
    try:
        return await entry.runtime_data.media.async_day_visits(day)
    except MediaError as err:
        if isinstance(err.__cause__, SiiPetAuthError):
            entry.async_start_reauth(hass)
        raise HomeAssistantError(
            translation_domain=DOMAIN,
            translation_key="request_failed",
            translation_placeholders={"error": str(err)},
        ) from err
