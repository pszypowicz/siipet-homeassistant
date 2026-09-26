"""Binary sensors for the SiiPet integration."""

from __future__ import annotations

from homeassistant.components.binary_sensor import (
    BinarySensorDeviceClass,
    BinarySensorEntity,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .coordinator import SiiPetConfigEntry, SiiPetCoordinator
from .entity import SiiPetCameraEntity, async_add_camera_entities

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: SiiPetConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add a connectivity sensor for each camera."""

    def build(coordinator: SiiPetCoordinator, sn: str) -> list[SiiPetConnectedSensor]:
        return [SiiPetConnectedSensor(coordinator, sn)]

    async_add_camera_entities(entry, async_add_entities, build)


class SiiPetConnectedSensor(SiiPetCameraEntity, BinarySensorEntity):
    """Whether the service reports the camera as connected."""

    _attr_device_class = BinarySensorDeviceClass.CONNECTIVITY

    def __init__(self, coordinator: SiiPetCoordinator, sn: str) -> None:
        """Create the sensor."""
        super().__init__(coordinator, sn, "connected")

    @property
    def is_on(self) -> bool:
        """True when the camera is connected."""
        return self.coordinator.data.cameras[self.sn].connected
