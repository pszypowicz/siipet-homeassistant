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

from .api import (
    SiiPetApiError,
    SiiPetAuthError,
    SiiPetClient,
    SiiPetError,
    Visit,
    VisitType,
)
from .api.edits import Annotate, EditCall, EditNotPossible, plan_edit
from .const import DOMAIN, UNKNOWN_CAT_ID, UNKNOWN_CAT_NAME
from .coordinator import SiiPetConfigEntry, SiiPetData, SiiPetRuntime
from .media import MediaError

SERVICE_LIST_VISITS = "list_visits"
SERVICE_UPDATE_VISIT = "update_visit"

ATTR_CAT = "cat"
ATTR_CATS = "cats"
ATTR_DATE = "date"
ATTR_DAYS = "days"
ATTR_EVENT_ID = "event_id"
ATTR_NOTE = "note"
ATTR_TYPE = "type"

NOTE_MAX_LENGTH = 200
# Detail codes for an event id that does not exist, and for a deleted visit.
UNKNOWN_VISIT_CODES = frozenset({10000, 40000})
VISIT_TYPES = {
    "pee": VisitType.PEE,
    "poop": VisitType.POOP,
    "lingering": VisitType.LINGERING,
}

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


UPDATE_VISIT_SCHEMA = vol.Schema(
    {
        vol.Required(ATTR_EVENT_ID): cv.string,
        vol.Optional(ATTR_CATS): vol.All(
            cv.ensure_list, [cv.string], vol.Length(min=1)
        ),
        vol.Optional(ATTR_TYPE): vol.In(list(VISIT_TYPES)),
        vol.Optional(ATTR_NOTE): vol.All(cv.string, vol.Length(max=NOTE_MAX_LENGTH)),
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
    hass.services.async_register(
        DOMAIN,
        SERVICE_UPDATE_VISIT,
        _async_update_visit,
        schema=UPDATE_VISIT_SCHEMA,
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


def _request_failed(
    hass: HomeAssistant,
    entry: SiiPetConfigEntry,
    err: SiiPetError,
    key: str,
    event_id: str,
) -> HomeAssistantError:
    """Return the translated error for a failed request, and start reauth on auth errors."""
    if isinstance(err, SiiPetAuthError):
        entry.async_start_reauth(hass)
    return HomeAssistantError(
        translation_domain=DOMAIN,
        translation_key=key,
        translation_placeholders={"event_id": event_id, "error": str(err)},
    )


async def _async_read_visit(
    hass: HomeAssistant, entry: SiiPetConfigEntry, event_id: str
) -> Visit:
    try:
        return await entry.runtime_data.client.get_visit(event_id)
    except SiiPetApiError as err:
        if err.code in UNKNOWN_VISIT_CODES:
            raise ServiceValidationError(
                translation_domain=DOMAIN,
                translation_key="unknown_visit",
                translation_placeholders={"event_id": event_id},
            ) from err
        raise _request_failed(hass, entry, err, "request_failed", event_id) from err
    except SiiPetError as err:
        raise _request_failed(hass, entry, err, "request_failed", event_id) from err


async def _async_send(client: SiiPetClient, event_id: str, edit: EditCall) -> None:
    if isinstance(edit, Annotate):
        await client.annotate(event_id, edit.operation, edit.result)
    else:
        await client.set_note(event_id, edit.note)


async def _async_after_change(runtime: SiiPetRuntime, visit: Visit) -> None:
    """Show the change: drop the cached day and read it again."""
    day = dt_util.as_local(visit.start).date()
    runtime.media.forget_day(day)
    await runtime.coordinator.async_refresh_day(day)


def _applied(
    visit: Visit,
    target: VisitType | None,
    cats: list[str] | None,
    note: str | None,
) -> bool:
    """Return True when the visit shows the requested type, cats, and memo."""
    if target is not None and visit.type is not target:
        return False
    if cats is not None and set(visit.pet_ids) != set(cats):
        return False
    return note is None or visit.note == note


async def _async_update_visit(call: ServiceCall) -> None:
    """Change the cats, the type, or the memo of a visit."""
    hass = call.hass
    entry = _loaded_entry(hass)
    runtime = entry.runtime_data
    event_id = call.data[ATTR_EVENT_ID]
    cats = None
    if ATTR_CATS in call.data:
        cats = [
            _cat_id(hass, entry, device_id, allow_unknown=False)
            for device_id in call.data[ATTR_CATS]
        ]
    visit_type = VISIT_TYPES[call.data[ATTR_TYPE]] if ATTR_TYPE in call.data else None
    note = call.data[ATTR_NOTE].strip() if ATTR_NOTE in call.data else None
    visit = await _async_read_visit(hass, entry, event_id)
    try:
        edits = plan_edit(visit, cats=cats, visit_type=visit_type, note=note)
    except EditNotPossible as err:
        raise ServiceValidationError(
            translation_domain=DOMAIN, translation_key=err.reason
        ) from err
    sent = 0
    try:
        for edit in edits:
            await _async_send(runtime.client, event_id, edit)
            sent += 1
        check = await runtime.client.get_visit(event_id)
    except SiiPetError as err:
        key = "edit_partial" if 0 < sent < len(edits) else "request_failed"
        raise _request_failed(hass, entry, err, key, event_id) from err
    finally:
        if sent:
            await _async_after_change(runtime, visit)
    target = None
    if cats is not None or visit_type is not None:
        target = visit_type if visit_type is not None else visit.type
    if not _applied(check, target, cats, note):
        raise HomeAssistantError(
            translation_domain=DOMAIN,
            translation_key="edit_not_applied",
            translation_placeholders={"event_id": event_id},
        )
