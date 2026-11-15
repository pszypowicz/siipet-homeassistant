"""Firmware update entities of the cameras. They show versions and never install."""

from __future__ import annotations

from homeassistant.components.update import (
    UpdateDeviceClass,
    UpdateEntity,
    UpdateEntityDescription,
    UpdateEntityFeature,
)
from homeassistant.const import EntityCategory
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .api import FirmwareRelease
from .api.settings import UPDATE_MODE_AUTOMATIC
from .coordinator import SiiPetConfigEntry
from .entity import SiiPetCameraStateEntity, async_add_camera_state_entities

# The entities read coordinator data only.
PARALLEL_UPDATES = 0

# An UpdateEntityDescription defaults to the config category. Without install
# the entity is diagnostic.
FIRMWARE = UpdateEntityDescription(
    key="firmware",
    device_class=UpdateDeviceClass.FIRMWARE,
    entity_category=EntityCategory.DIAGNOSTIC,
)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: SiiPetConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add the firmware entity of each camera."""
    async_add_camera_state_entities(
        entry, async_add_entities, lambda sn: [SiiPetFirmwareUpdate(entry, sn)]
    )


def _markdown(release: FirmwareRelease) -> str | None:
    blocks = []
    for section in release.notes:
        lines = [f"**{section.title}**"] if section.title else []
        lines += [f"- {line}" for line in section.lines]
        blocks.append("\n".join(lines))
    return "\n\n".join(blocks) or None


class SiiPetFirmwareUpdate(SiiPetCameraStateEntity, UpdateEntity):
    """The installed and the latest firmware of a camera."""

    entity_description = FIRMWARE
    _attr_supported_features = UpdateEntityFeature.RELEASE_NOTES

    def __init__(self, entry: SiiPetConfigEntry, sn: str) -> None:
        """Bind the entity to a camera."""
        super().__init__(entry, sn, FIRMWARE.key)

    @property
    def _release(self) -> FirmwareRelease | None:
        data = self._main.data
        camera = data.cameras.get(self.sn)
        if data.system is None or camera is None or not camera.product_id:
            return None
        return data.system.firmware.get(camera.product_id)

    @property
    def installed_version(self) -> str | None:
        """The version that the camera reports."""
        return self.state_data.firmware

    @property
    def latest_version(self) -> str | None:
        """The latest version that SiiPet offers for the camera's product."""
        release = self._release
        return release.version if release is not None else None

    @property
    def auto_update(self) -> bool:
        """True in automatic mode. An unknown mode counts as manual."""
        return self.state_data.update_mode == UPDATE_MODE_AUTOMATIC

    @property
    def title(self) -> str | None:
        """The product name that SiiPet gives the firmware."""
        release = self._release
        return release.title if release is not None else None

    async def async_release_notes(self) -> str | None:
        """The release notes of the latest version, as markdown."""
        release = self._release
        return _markdown(release) if release is not None else None
