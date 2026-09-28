"""Tests for the SiiPet API models."""

from __future__ import annotations

from datetime import UTC, date, datetime

import pytest

from custom_components.siipet.api import (
    AbnormalLabels,
    CalendarDay,
    Camera,
    Cat,
    DayVisits,
    MediaCredentials,
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


def test_media_credentials_from_api() -> None:
    """Media credentials keep the bucket, the keys, and the expiry."""
    credentials = MediaCredentials.from_api(load_data("aws_auth.json"))
    assert credentials.bucket == "media-bucket"
    assert credentials.access_key_id == "AKIDEXAMPLE"
    assert credentials.secret_access_key == "wJalrXUtnFEMI/K7MDENG+bPxRfiCYEXAMPLEKEY"
    assert credentials.session_token == "FwoGZXIvYXdzEXAMPLE/token+part=="
    assert credentials.expires == datetime(2026, 9, 26, 22, 0, tzinfo=UTC)


def test_media_credentials_repr_hides_secrets() -> None:
    """The repr of media credentials has no bucket, key, or session token."""
    text = repr(MediaCredentials.from_api(load_data("aws_auth.json")))
    assert "wJalrXUtnFEMI" not in text
    assert "FwoGZXIvYXdz" not in text
    assert "media-bucket" not in text
    assert "AKIDEXAMPLE" not in text


@pytest.mark.parametrize(
    "data",
    [
        {},
        {"S3": {"S3Bucket": "media-bucket"}},
        {"S3": {**load_data("aws_auth.json")["S3"], "ExpireTime": None}},
    ],
)
def test_media_credentials_invalid(data: dict[str, object]) -> None:
    """Credentials without every field raise an error for the client to wrap."""
    with pytest.raises((KeyError, ValueError)):
        MediaCredentials.from_api(data)


def test_calendar_day_from_api() -> None:
    """A calendar day keeps its counts and durations, and any summary flag marks it."""
    days = [
        CalendarDay.from_api(item)
        for item in load_data("pet_calendar.json")["DataCalendar"]
    ]
    assert days[0] == CalendarDay(
        date=date(2026, 9, 24),
        normal=3,
        abnormal=1,
        normal_ms=210000,
        abnormal_ms=95000,
        flagged=True,
    )
    assert days[1].flagged
    assert not days[2].flagged


def test_calendar_day_flag_needs_true() -> None:
    """A summary value that is not a boolean true does not flag the day."""
    day = CalendarDay.from_api(
        {"Date": "2026-09-24", "AbnormalSummary": {"Event": False, "Level": 2}}
    )
    assert not day.flagged


def test_visit_media_sizes() -> None:
    """A visit keeps the byte sizes of its media and the MD5 of its recording."""
    visit = _visit("ev-1")
    assert visit.video_size == 1048576
    assert visit.video_md5 == "00000000000000000000000000000000"
    assert visit.cover_size == 51200
    assert visit.stool_size == 40960
    assert _visit("ev-2").stool_size is None


@pytest.mark.parametrize(
    ("raw_info", "size", "md5"),
    [
        ({}, None, None),
        ({"Size": 0, "Md5": ""}, None, None),
        ({"Size": -5, "Md5": "not-a-hash"}, None, None),
        ({"Size": "big", "Md5": None}, None, None),
        (
            {"Size": "2048", "Md5": "ABCDEF0123456789ABCDEF0123456789"},
            2048,
            "abcdef0123456789abcdef0123456789",
        ),
        ({"Size": 10, "Md5": "abc"}, 10, None),
    ],
)
def test_visit_video_size_and_md5(
    raw_info: dict[str, object], size: int | None, md5: str | None
) -> None:
    """A missing or invalid size or hash gives None. A hash is kept in lowercase."""
    visit = Visit.from_api({"EventId": "ev-x", "ToiletVideo": {"RawInfo": raw_info}})
    assert visit.video_size == size
    assert visit.video_md5 == md5
