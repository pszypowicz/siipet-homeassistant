"""The SiiPet integration."""

from __future__ import annotations

from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers import config_validation as cv, device_registry as dr
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.typing import ConfigType

from .api import Session, SiiPetClient
from .api.s3 import S3Signer
from .calendar_data import SiiPetCalendar
from .const import CONF_CLIENT_ID, CONF_EXPIRE_AT, CONF_TOKEN, DOMAIN, UNKNOWN_CAT_ID
from .coordinator import SiiPetConfigEntry, SiiPetCoordinator, SiiPetRuntime
from .media import SiiPetMedia
from .services import async_setup_services
from .views import SiiPetImageView

PLATFORMS: list[Platform] = [Platform.EVENT, Platform.SENSOR]
SESSION_KEYS = (CONF_TOKEN, CONF_EXPIRE_AT, CONF_CLIENT_ID)

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Register the image view once for the integration."""
    hass.http.register_view(SiiPetImageView(hass))
    async_setup_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: SiiPetConfigEntry) -> bool:
    """Set up SiiPet from a config entry."""
    if any(key not in entry.data for key in SESSION_KEYS):
        raise ConfigEntryError(
            translation_domain=DOMAIN, translation_key="entry_outdated"
        )

    @callback
    def _async_save_session(session: Session) -> None:
        hass.config_entries.async_update_entry(
            entry,
            data={
                **entry.data,
                CONF_TOKEN: session.token,
                CONF_EXPIRE_AT: session.expire_at,
            },
        )

    client = SiiPetClient(
        async_get_clientsession(hass),
        client_id=entry.data[CONF_CLIENT_ID],
        time_zone=str(hass.config.time_zone),
        session=Session(entry.data[CONF_TOKEN], entry.data[CONF_EXPIRE_AT]),
        on_session_update=_async_save_session,
    )
    coordinator = SiiPetCoordinator(hass, entry, client)
    await coordinator.async_config_entry_first_refresh()
    media = SiiPetMedia(
        hass, coordinator, client, S3Signer(client.get_media_credentials)
    )
    entry.runtime_data = SiiPetRuntime(
        client=client,
        coordinator=coordinator,
        media=media,
        calendar=SiiPetCalendar(client),
    )
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: SiiPetConfigEntry) -> bool:
    """Unload a SiiPet config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)


async def async_remove_config_entry_device(
    hass: HomeAssistant, entry: SiiPetConfigEntry, device_entry: dr.DeviceEntry
) -> bool:
    """Allow removal of a cat or camera device that the account no longer has.

    Without a loaded entry there is no current data, so nothing is removable.
    """
    if entry.state is not ConfigEntryState.LOADED:
        return False
    data = entry.runtime_data.coordinator.data
    current = {UNKNOWN_CAT_ID, *data.cats, *data.cameras}
    return not any(
        domain == DOMAIN and identifier in current
        for domain, identifier in device_entry.identifiers
    )
