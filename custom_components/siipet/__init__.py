"""The SiiPet integration."""

from __future__ import annotations

from homeassistant.const import Platform
from homeassistant.core import HomeAssistant, callback
from homeassistant.exceptions import ConfigEntryError
from homeassistant.helpers.aiohttp_client import async_get_clientsession

from .api import Session, SiiPetClient
from .const import CONF_CLIENT_ID, CONF_EXPIRE_AT, CONF_TOKEN
from .coordinator import SiiPetConfigEntry, SiiPetCoordinator, SiiPetRuntime

PLATFORMS: list[Platform] = [Platform.EVENT, Platform.SENSOR]
SESSION_KEYS = (CONF_TOKEN, CONF_EXPIRE_AT, CONF_CLIENT_ID)


async def async_setup_entry(hass: HomeAssistant, entry: SiiPetConfigEntry) -> bool:
    """Set up SiiPet from a config entry."""
    if any(key not in entry.data for key in SESSION_KEYS):
        raise ConfigEntryError("Remove the SiiPet entry and add it again")

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
    entry.runtime_data = SiiPetRuntime(client=client, coordinator=coordinator)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: SiiPetConfigEntry) -> bool:
    """Unload a SiiPet config entry."""
    return await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
