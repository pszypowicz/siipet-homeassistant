"""Actions of the SiiPet integration."""

from __future__ import annotations

from datetime import date, timedelta
from typing import Any

from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.exceptions import HomeAssistantError, ServiceValidationError
from homeassistant.helpers import config_validation as cv, device_registry as dr
from homeassistant.util import dt as dt_util
import voluptuous as vol

from .api import Visit
from .const import DOMAIN, UNKNOWN_CAT_ID, UNKNOWN_CAT_NAME
from .coordinator import SiiPetConfigEntry, SiiPetData
from .media import MediaError

SERVICE_LIST_VISITS = "list_visits"

ATTR_CAT = "cat"
ATTR_DATE = "date"
ATTR_DAYS = "days"

# The day list keeps today and the 30 days before it.
HISTORY_DAYS = 30

LIST_VISITS_SCHEMA = vol.Schema(
    {
        vol.Optional(ATTR_DATE): cv.date,
        vol.Optional(ATTR_DAYS, default=1): vol.All(
            vol.Coerce(int), vol.Range(min=1, max=7)
        ),
        vol.Optional(ATTR_CAT): cv.string,
    }
)


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the SiiPet actions."""
    hass.services.async_register(
        DOMAIN,
        SERVICE_LIST_VISITS,
        _async_list_visits,
        schema=LIST_VISITS_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )


def _loaded_entry(hass: HomeAssistant) -> SiiPetConfigEntry:
    entries = hass.config_entries.async_loaded_entries(DOMAIN)
    if not entries:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key="not_loaded"
        )
    return entries[0]


def _cat_id(
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


def _device_ids(hass: HomeAssistant, entry: SiiPetConfigEntry) -> dict[str, str]:
    """Map pet ids and UNKNOWN_CAT_ID to their device ids."""
    registry = dr.async_get(hass)
    ids: dict[str, str] = {}
    for cat_id in (*entry.runtime_data.coordinator.data.cats, UNKNOWN_CAT_ID):
        device = registry.async_get_device_by_identifier(
            (DOMAIN, cat_id), entry.entry_id
        )
        if device is not None:
            ids[cat_id] = device.id
    return ids


def _visit_response(
    data: SiiPetData, devices: dict[str, str], visit: Visit
) -> dict[str, Any]:
    camera = data.cameras.get(visit.sn)
    return {
        "event_id": visit.event_id,
        "start": dt_util.as_local(visit.start).isoformat(),
        "duration": round(visit.duration_ms / 1000),
        "type": visit.type.key,
        "cats": [
            {"device_id": devices.get(cat_id), "name": data.cats[cat_id].name}
            for cat_id in data.cat_ids(visit)
            if cat_id in data.cats
        ],
        "camera": camera.name if camera else None,
        "note": visit.note,
        "abnormal": visit.abnormal,
        "abnormal_reasons": data.labels.reasons(visit),
        "has_video": visit.cloud_stored and visit.video_key is not None,
        "has_stool_image": visit.stool_key is not None,
    }


async def _async_list_visits(call: ServiceCall) -> ServiceResponse:
    """Return the visits of up to 7 days that end on `date`, newest first."""
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = entry.runtime_data
    data = runtime.coordinator.data
    last: date = call.data.get(ATTR_DATE, data.today)
    first_allowed = data.today - timedelta(days=HISTORY_DAYS)
    if not first_allowed <= last <= data.today:
        raise ServiceValidationError(
            translation_domain=DOMAIN,
            translation_key="date_out_of_range",
            translation_placeholders={
                "first": first_allowed.isoformat(),
                "last": data.today.isoformat(),
            },
        )
    cat_filter = None
    if ATTR_CAT in call.data:
        cat_filter = _cat_id(hass, entry, call.data[ATTR_CAT], allow_unknown=True)
    visits: list[Visit] = []
    for offset in range(call.data[ATTR_DAYS]):
        try:
            visits.extend(
                await runtime.media.async_day_visits(last - timedelta(days=offset))
            )
        except MediaError as err:
            raise HomeAssistantError(
                translation_domain=DOMAIN,
                translation_key="request_failed",
                translation_placeholders={"error": str(err)},
            ) from err
    if cat_filter is not None:
        visits = [visit for visit in visits if cat_filter in data.cat_ids(visit)]
    devices = _device_ids(hass, entry)
    cats = [
        {"device_id": devices.get(pet_id), "name": cat.name, "unknown": False}
        for pet_id, cat in data.cats.items()
    ]
    cats.append(
        {
            "device_id": devices.get(UNKNOWN_CAT_ID),
            "name": UNKNOWN_CAT_NAME,
            "unknown": True,
        }
    )
    return {
        "cats": cats,
        "visits": [_visit_response(data, devices, visit) for visit in visits],
    }
