"""Tests for the SiiPet API models."""

from __future__ import annotations

from datetime import UTC, datetime

import pytest

from custom_components.siipet.api import (
    AbnormalLabels,
    Camera,
    Cat,
    DayVisits,
    Visit,
    VisitType,
)

from ..common import load_data


def _day() -> DayVisits:
    return DayVisits.from_api(load_data("toilet_event_day.json"))


def _visit(event_id: str) -> Visit:
    return next(visit for visit in _day().visits if visit.event_id == event_id)


def test_cat_from_api() -> None:
    """A cat keeps its id, name, and avatar key."""
    cat = Cat.from_api(load_data("pet_sync.json")["List"][0])
    assert cat == Cat(pet_id="pet-luna", name="Luna", avatar_key="resources/luna.jpg")


def test_camera_from_api() -> None:
    """A camera keeps name, model, role, and subscription expiry."""
    first, second = (
        Camera.from_api(item) for item in load_data("device_sync.json")["List"]
    )
    assert first.sn == "SN0001"
    assert first.name == "Bathroom"
    assert first.product_id == "JOY1"
    assert first.role == 1
    assert first.subscription_expires == datetime(2027, 1, 1, tzinfo=UTC)
    assert second.subscription_expires is None


def test_camera_name_falls_back_to_product_id() -> None:
    """A camera without a device name uses its product id, never its serial."""
    camera = Camera.from_api({"SN": "SN0099", "ProductId": "JOY1"})
    assert camera.name == "JOY1"


def test_camera_name_falls_back_to_camera() -> None:
    """A camera without a device name or a product id is named Camera."""
    camera = Camera.from_api({"SN": "SN0099"})
    assert camera.name == "Camera"


def test_visit_from_api() -> None:
    """A visit keeps timing, type, media keys, and abnormal codes."""
    visit = _visit("ev-1")
    assert visit.pet_ids == ("pet-luna",)
    assert visit.sn == "SN0001"
    assert visit.start == datetime(2026, 9, 26, 6, 48, tzinfo=UTC)
    assert visit.duration_ms == 80000
    assert visit.type is VisitType.POOP
    assert visit.feces_abnormal == (0, 0)
    assert visit.cloud_stored is True
    assert visit.video_key == "events/ev-1/video.mp4"
    assert visit.cover_key == "events/ev-1/cover.jpg"
    assert visit.stool_key == "events/ev-1/stool.jpg"


def test_visit_without_cat() -> None:
    """An unrecognized visit has no pet ids."""
    assert _visit("ev-4").pet_ids == ()


def test_visit_pet_id_fallback() -> None:
    """`PetId` fills `pet_ids` when `PetIds` is empty."""
    visit = Visit.from_api({"EventId": "ev-x", "PetId": "pet-luna", "PetIds": None})
    assert visit.pet_ids == ("pet-luna",)


def test_visit_pet_ids_wins_over_pet_id() -> None:
    """`PetIds` wins over `PetId` when both exist."""
    visit = Visit.from_api(
        {"EventId": "ev-x", "PetId": "pet-luna", "PetIds": ["pet-milo"]}
    )
    assert visit.pet_ids == ("pet-milo",)


@pytest.mark.parametrize(
    ("value", "expected"),
    [
        (0, VisitType.UNKNOWN),
        (1, VisitType.LINGERING),
        (2, VisitType.POOP),
        (3, VisitType.PEE),
        (9, VisitType.UNKNOWN),
        (None, VisitType.UNKNOWN),
    ],
)
def test_visit_type_from_api(value: object, expected: VisitType) -> None:
    """Values outside the enum map to UNKNOWN."""
    assert VisitType.from_api(value) is expected


@pytest.mark.parametrize(
    ("event_id", "abnormal"),
    [("ev-1", False), ("ev-2", False), ("ev-3", False), ("ev-5", True), ("ev-6", True)],
)
def test_visit_abnormal(event_id: str, abnormal: bool) -> None:
    """Pee or poop with a positive stool code or event code is abnormal."""
    assert _visit(event_id).abnormal is abnormal


def test_lingering_is_never_abnormal() -> None:
    """Only pee and poop can be abnormal."""
    visit = Visit.from_api(
        {"EventId": "ev-x", "Type": 1, "EventAbnormal": 301, "FecesAbnormal": [104, 0]}
    )
    assert visit.abnormal is False


def test_day_visits_from_api() -> None:
    """A day keeps its visits, summaries by cat, and the paging flag."""
    day = _day()
    assert len(day.visits) == 6
    assert day.summaries["pet-luna"].baseline_times == 3.5
    assert day.summaries["pet-milo"].current_days == 3
    assert day.more is False


def test_day_visits_empty() -> None:
    """A null list gives an empty day."""
    assert DayVisits.from_api({"List": None, "TodaySummary": None}) == DayVisits(
        (), {}, False
    )


def test_abnormal_labels() -> None:
    """Labels skip code 0 and strip whitespace."""
    labels = AbnormalLabels.from_api(load_data("system_config.json"))
    assert labels.shape == {101: "Hard lumpy stool", 104: "Watery stool"}
    assert labels.color == {202: "Bright red stool"}
    assert labels.event == {301: "Potty Overtime"}


def test_abnormal_reasons() -> None:
    """Reasons use titles, and a code without a title falls back to its number."""
    labels = AbnormalLabels.from_api(load_data("system_config.json"))
    assert labels.reasons(_visit("ev-5")) == ["Watery stool"]
    assert labels.reasons(_visit("ev-6")) == ["Potty Overtime"]
    assert labels.reasons(_visit("ev-1")) == []
    odd = Visit.from_api({"EventId": "ev-x", "Type": 2, "FecesAbnormal": [199, 202]})
    assert labels.reasons(odd) == ["199", "Bright red stool"]
