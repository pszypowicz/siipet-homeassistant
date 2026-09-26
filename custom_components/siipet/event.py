"""Visit event entities for the SiiPet integration."""

from __future__ import annotations

from homeassistant.components.event import EventEntity
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

from .api import VisitType
from .coordinator import SiiPetConfigEntry, SiiPetCoordinator, SiiPetData
from .entity import SiiPetCatEntity, async_add_cat_entities, visit_attributes

PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: SiiPetConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add a visit event entity for each cat and the Unknown cat."""

    def build(coordinator: SiiPetCoordinator, cat_id: str) -> list[SiiPetVisitEvent]:
        return [SiiPetVisitEvent(coordinator, cat_id)]

    async_add_cat_entities(entry, async_add_entities, build)


class SiiPetVisitEvent(SiiPetCatEntity, EventEntity):
    """Fires once for each new visit of the cat."""

    def __init__(self, coordinator: SiiPetCoordinator, cat_id: str) -> None:
        """Create the event entity."""
        super().__init__(coordinator, cat_id, "visit")
        self._attr_event_types = [visit_type.key for visit_type in VisitType]
        self._handled_data: SiiPetData | None = None

    @callback
    def _handle_coordinator_update(self) -> None:
        data = self.coordinator.data
        if data is self._handled_data:
            # A failed refresh notifies listeners with the same snapshot
            # again. Its visits were already fired, so only availability
            # changed.
            super()._handle_coordinator_update()
            return
        fired = False
        for visit in data.new_visits:
            if self.cat_id in data.cat_ids(visit):
                self._trigger_event(visit.type.key, visit_attributes(data, visit))
                self.async_write_ha_state()
                fired = True
        self._handled_data = data
        if not fired:
            super()._handle_coordinator_update()
