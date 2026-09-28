"""Tests for the SiiPet edit planner."""

from __future__ import annotations

from dataclasses import replace

import pytest

from custom_components.siipet.api import Visit, VisitType
from custom_components.siipet.api.edits import (
    NOTHING_TO_CHANGE,
    TYPE_REQUIRED,
    Annotate,
    EditNotPossible,
    SetNote,
    plan_edit,
)

from ..common import load_data

LUNA = "pet-luna"
MILO = "pet-milo"
PEE = Annotate(3, {"Type": 3})


def _visit(visit_type: VisitType, pet_ids: tuple[str, ...] = (LUNA,)) -> Visit:
    base = Visit.from_api(load_data("event_detail.json"))
    return replace(base, type=visit_type, pet_ids=pet_ids)


def _op2(pet_ids: list[str], gone_potty: bool, manual: bool) -> Annotate:
    return Annotate(2, {"PetIds": pet_ids, "GonePotty": gone_potty, "Manual": manual})


@pytest.mark.parametrize(
    ("current", "cats", "visit_type", "expected"),
    [
        # To lingering, from any type.
        (VisitType.POOP, None, VisitType.LINGERING, [_op2([LUNA], False, False)]),
        (VisitType.PEE, None, VisitType.LINGERING, [_op2([LUNA], False, False)]),
        (VisitType.UNKNOWN, None, VisitType.LINGERING, [_op2([LUNA], False, False)]),
        # To poop, from pee, lingering, or unknown.
        (VisitType.PEE, None, VisitType.POOP, [_op2([LUNA], True, False)]),
        (VisitType.LINGERING, None, VisitType.POOP, [_op2([LUNA], True, False)]),
        (VisitType.UNKNOWN, None, VisitType.POOP, [_op2([LUNA], True, False)]),
        # To pee, from poop or unknown, then from lingering.
        (VisitType.POOP, None, VisitType.PEE, [PEE]),
        (VisitType.UNKNOWN, None, VisitType.PEE, [PEE]),
        (VisitType.LINGERING, None, VisitType.PEE, [_op2([LUNA], True, False), PEE]),
        # Reassign, keeping the type.
        (VisitType.POOP, [MILO], None, [_op2([MILO], True, True)]),
        (VisitType.PEE, [MILO], None, [_op2([MILO], True, True), PEE]),
        (VisitType.LINGERING, [MILO], None, [_op2([MILO], False, True)]),
        (VisitType.POOP, [LUNA, MILO], None, [_op2([LUNA, MILO], True, True)]),
        # Reassign and change the type together.
        (VisitType.POOP, [MILO], VisitType.PEE, [_op2([MILO], True, True), PEE]),
        (VisitType.UNKNOWN, [MILO], VisitType.POOP, [_op2([MILO], True, True)]),
    ],
)
def test_plan_edit(
    current: VisitType,
    cats: list[str] | None,
    visit_type: VisitType | None,
    expected: list[Annotate],
) -> None:
    """Each request becomes the calls from the live-checked mapping."""
    assert plan_edit(_visit(current), cats=cats, visit_type=visit_type) == expected


def test_plan_edit_note_comes_last() -> None:
    """A memo is set after the annotate calls."""
    calls = plan_edit(_visit(VisitType.POOP), visit_type=VisitType.PEE, note="test")
    assert calls == [PEE, SetNote("test")]


def test_plan_edit_note_only() -> None:
    """A memo alone sends only the memo edit, also on an unknown visit."""
    assert plan_edit(_visit(VisitType.UNKNOWN), note="") == [SetNote("")]


@pytest.mark.parametrize(
    ("current", "cats", "visit_type", "reason"),
    [
        (VisitType.POOP, None, None, NOTHING_TO_CHANGE),
        (VisitType.POOP, None, VisitType.POOP, NOTHING_TO_CHANGE),
        (VisitType.PEE, None, VisitType.PEE, NOTHING_TO_CHANGE),
        (VisitType.UNKNOWN, [MILO], None, TYPE_REQUIRED),
    ],
)
def test_plan_edit_not_possible(
    current: VisitType,
    cats: list[str] | None,
    visit_type: VisitType | None,
    reason: str,
) -> None:
    """A request with nothing to change, or cats for an unknown visit, is refused."""
    with pytest.raises(EditNotPossible) as info:
        plan_edit(_visit(current), cats=cats, visit_type=visit_type)
    assert info.value.reason == reason
