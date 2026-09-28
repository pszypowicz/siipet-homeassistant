"""Turn a visit edit request into the ordered SiiPet annotate and memo calls."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from .models import Visit, VisitType

# Annotate operations (the outer Type of the annotate call).
OP_TOILET_ERROR = 2
OP_TOILET_FECES_ERROR = 3

# Reasons for EditNotPossible. They double as translation keys.
NOTHING_TO_CHANGE = "nothing_to_change"
TYPE_REQUIRED = "type_required"


class EditNotPossible(ValueError):
    """The request cannot become SiiPet calls. `reason` names why."""

    def __init__(self, reason: str) -> None:
        """Keep the reason."""
        super().__init__(reason)
        self.reason = reason


@dataclass(frozen=True, slots=True)
class Annotate:
    """One annotate call: the operation and its result object."""

    operation: int
    result: Mapping[str, Any]


@dataclass(frozen=True, slots=True)
class SetNote:
    """One memo edit."""

    note: str


type EditCall = Annotate | SetNote


def plan_edit(
    visit: Visit,
    *,
    cats: Sequence[str] | None = None,
    visit_type: VisitType | None = None,
    note: str | None = None,
) -> list[EditCall]:
    """Return the calls that give the visit the requested cats, type, and memo.

    `cats` are pet ids. `visit_type` is pee, poop, or lingering.
    """
    current = visit.type
    if current is VisitType.UNKNOWN and cats is not None and visit_type is None:
        raise EditNotPossible(TYPE_REQUIRED)
    target = visit_type if visit_type is not None else current
    manual = cats is not None
    pet_ids = list(cats) if cats is not None else list(visit.pet_ids)

    def toilet_error(gone_potty: bool) -> Annotate:
        return Annotate(
            OP_TOILET_ERROR,
            {"PetIds": pet_ids, "GonePotty": gone_potty, "Manual": manual},
        )

    calls: list[EditCall] = []
    if target is VisitType.LINGERING:
        if manual or current is not VisitType.LINGERING:
            calls.append(toilet_error(False))
    elif target is VisitType.POOP:
        if manual or current is not VisitType.POOP:
            calls.append(toilet_error(True))
    elif target is VisitType.PEE:
        if manual or current is VisitType.LINGERING:
            # Operation 2 leaves the visit as poop, so operation 3 follows.
            calls.append(toilet_error(True))
        if calls or current is not VisitType.PEE:
            calls.append(Annotate(OP_TOILET_FECES_ERROR, {"Type": VisitType.PEE.value}))
    if note is not None:
        calls.append(SetNote(note))
    if not calls:
        raise EditNotPossible(NOTHING_TO_CHANGE)
    return calls
