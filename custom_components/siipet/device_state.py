"""Device state of the cameras, pushed by the shadow link."""

from __future__ import annotations

from datetime import datetime
import logging
from typing import TYPE_CHECKING

from homeassistant.core import CALLBACK_TYPE, HassJob, HomeAssistant, callback
from homeassistant.helpers import device_registry as dr
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_call_later
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import CameraShadows, DeviceState, SiiPetClient
from .api.shadow_link import LinkStatus, ShadowLink
from .const import DEVICE_STATE_GRACE, DOMAIN

if TYPE_CHECKING:
    from .coordinator import SiiPetConfigEntry, SiiPetCoordinator

_LOGGER = logging.getLogger(__name__)


class SiiPetDeviceCoordinator(DataUpdateCoordinator[dict[str, DeviceState]]):
    """Keep the device state of each camera, by serial number."""

    config_entry: SiiPetConfigEntry

    def __init__(
        self,
        hass: HomeAssistant,
        entry: SiiPetConfigEntry,
        coordinator: SiiPetCoordinator,
        client: SiiPetClient,
    ) -> None:
        """Create the coordinator and its link. `async_start` starts the link."""
        super().__init__(
            hass, _LOGGER, config_entry=entry, name=f"{DOMAIN} device state"
        )
        self.data = {}
        self._coordinator = coordinator
        self._link = ShadowLink(
            async_get_clientsession(hass),
            client.get_iot_credentials,
            self._async_on_state,
            self._async_on_connection,
            self._label,
        )
        self._shadows: dict[str, CameraShadows] = {}
        self._firmware: dict[str, str] = {}
        self._cancel_grace: CALLBACK_TYPE | None = None
        # Shutdown cancels the timer, like the other Home Assistant timers.
        self._grace_job = HassJob(
            self._async_grace_over,
            f"{DOMAIN} device state grace",
            cancel_on_shutdown=True,
        )

    @property
    def link_status(self) -> LinkStatus:
        """The state of the link, for diagnostics."""
        return self._link.status

    @callback
    def async_start(self) -> None:
        """Start the link in the background. Setup does not wait for AWS IoT."""
        entry = self.config_entry
        self._async_cameras_changed()
        # The link starts without a connection, so the grace runs until it connects.
        self._async_on_connection(False)
        entry.async_on_unload(
            self._coordinator.async_add_listener(self._async_cameras_changed)
        )
        entry.async_on_unload(self._async_stop)
        entry.async_create_background_task(
            self.hass, self._link.run(), f"{DOMAIN} shadow link"
        )

    async def _async_stop(self) -> None:
        self._async_cancel_grace()
        await self._link.stop()

    @callback
    def _async_cameras_changed(self) -> None:
        cameras = self._coordinator.data.cameras
        shadows = {
            sn: camera.shadows
            for sn, camera in cameras.items()
            if camera.shadows is not None
        }
        if shadows == self._shadows:
            return
        self._shadows = shadows
        self._link.set_cameras(shadows)
        if any(sn not in shadows for sn in self.data):
            self.data = {sn: state for sn, state in self.data.items() if sn in shadows}
            self.async_update_listeners()

    def _label(self, sn: str) -> str:
        camera = self._coordinator.data.cameras.get(sn)
        return camera.name if camera else "a removed camera"

    @callback
    def _async_on_state(self, sn: str, state: DeviceState) -> None:
        if sn not in self._shadows:
            return
        self._async_update_firmware(sn, state.firmware)
        self.async_set_updated_data({**self.data, sn: state})

    @callback
    def _async_update_firmware(self, sn: str, firmware: str | None) -> None:
        if firmware is None or self._firmware.get(sn) == firmware:
            return
        registry = dr.async_get(self.hass)
        device = registry.async_get_device_by_identifier(
            (DOMAIN, sn), self.config_entry.entry_id
        )
        if device is None:
            return
        self._firmware[sn] = firmware
        if device.sw_version != firmware:
            registry.async_update_device(device.id, sw_version=firmware)

    @callback
    def _async_on_connection(self, connected: bool) -> None:
        if connected:
            self._async_cancel_grace()
        elif self._cancel_grace is None:
            self._cancel_grace = async_call_later(
                self.hass, DEVICE_STATE_GRACE, self._grace_job
            )

    @callback
    def _async_grace_over(self, _now: datetime) -> None:
        self._cancel_grace = None
        self.async_set_update_error(
            UpdateFailed("No connection to the SiiPet device state for 15 minutes")
        )

    @callback
    def _async_cancel_grace(self) -> None:
        if self._cancel_grace is not None:
            self._cancel_grace()
            self._cancel_grace = None
