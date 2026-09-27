"""Typed models for SiiPet API responses."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import IntEnum
from typing import Any


def _from_ms(value: Any) -> datetime | None:
    """Convert milliseconds since the Unix epoch to an aware datetime."""
    if not value:
        return None
    return datetime.fromtimestamp(int(value) / 1000, tz=UTC)


def _media_key(media: Any) -> str | None:
    """Return the bucket key of a media object, or None."""
    if not isinstance(media, Mapping):
        return None
    return media.get("Url") or None


class VisitType(IntEnum):
    """Visit classification from the `Type` field of a visit."""

    UNKNOWN = 0
    LINGERING = 1
    POOP = 2
    PEE = 3

    @classmethod
    def from_api(cls, value: Any) -> VisitType:
        """Map an API value to a type. Values outside the enum map to UNKNOWN."""
        try:
            return cls(int(value))
        except TypeError, ValueError:
            return cls.UNKNOWN

    @property
    def key(self) -> str:
        """Lowercase name for entity states and event types."""
        return self.name.lower()

    @property
    def is_litter_use(self) -> bool:
        """True for pee and poop, the types that the calendar counts."""
        return self in (VisitType.POOP, VisitType.PEE)


@dataclass(frozen=True, slots=True)
class Cat:
    """A cat from `user/pet/sync`."""

    pet_id: str
    name: str
    avatar_key: str | None

    @classmethod
    def from_api(cls, data: Mapping[str, Any]) -> Cat:
        """Parse one entry of `Data.List`."""
        return cls(
            pet_id=str(data["PetId"]),
            name=str(data.get("Name") or ""),
            avatar_key=_media_key(data.get("avatar")),
        )


@dataclass(frozen=True, slots=True)
class Camera:
    """A camera from `user/device/sync`."""

    sn: str
    name: str
    product_id: str
    role: int
    subscription_expires: datetime | None

    @classmethod
    def from_api(cls, data: Mapping[str, Any]) -> Camera:
        """Parse one entry of `Data.List`."""
        subscription = data.get("PurchaseSubscribe") or {}
        return cls(
            sn=str(data["SN"]),
            name=str(data.get("DeviceName") or data.get("ProductId") or "Camera"),
            product_id=str(data.get("ProductId") or ""),
            role=int(data.get("Role") or 0),
            subscription_expires=_from_ms(subscription.get("ExpireTime")),
        )


@dataclass(frozen=True, slots=True)
class Visit:
    """One litter box visit from `pet/toilet/event` or the event detail."""

    event_id: str
    sn: str
    pet_ids: tuple[str, ...]
    group_id: str
    start: datetime
    duration_ms: int
    type: VisitType
    note: str
    feces_abnormal: tuple[int | None, ...]
    event_abnormal: int
    cloud_stored: bool
    video_key: str | None
    cover_key: str | None
    stool_key: str | None

    @classmethod
    def from_api(cls, data: Mapping[str, Any]) -> Visit:
        """Parse one visit. `PetIds` wins over `PetId` when both exist."""
        pet_ids = tuple(str(pet) for pet in data.get("PetIds") or () if pet)
        if not pet_ids and data.get("PetId"):
            pet_ids = (str(data["PetId"]),)
        video = data.get("ToiletVideo") or {}
        return cls(
            event_id=str(data["EventId"]),
            sn=str(data.get("SN") or ""),
            pet_ids=pet_ids,
            group_id=str(data.get("GroupId") or ""),
            start=_from_ms(data.get("EventTimestamp"))
            or datetime.fromtimestamp(0, UTC),
            duration_ms=int(data.get("Duration") or 0),
            type=VisitType.from_api(data.get("Type")),
            note=str(data.get("Note") or ""),
            feces_abnormal=tuple(
                None if code is None else int(code)
                for code in data.get("FecesAbnormal") or ()
            ),
            event_abnormal=int(data.get("EventAbnormal") or 0),
            cloud_stored=bool(data.get("CloudStorageStatus")),
            video_key=_media_key(video.get("RawInfo")),
            cover_key=_media_key(video.get("Cover")),
            stool_key=_media_key(data.get("FecesImage")),
        )

    @property
    def abnormal(self) -> bool:
        """Pee or poop with a positive stool code or a positive event code."""
        if not self.type.is_litter_use:
            return False
        if self.event_abnormal > 0:
            return True
        return any(code is not None and code > 0 for code in self.feces_abnormal)


@dataclass(frozen=True, slots=True)
class DaySummary:
    """One entry of `Data.TodaySummary`."""

    pet_id: str
    baseline_times: float
    baseline_avg_ms: float
    needed_days: int
    current_days: int

    @classmethod
    def from_api(cls, data: Mapping[str, Any]) -> DaySummary:
        """Parse one summary entry."""
        return cls(
            pet_id=str(data["PetId"]),
            baseline_times=float(data.get("BaselineTimes") or 0),
            baseline_avg_ms=float(data.get("BaselineAvgTime") or 0),
            needed_days=int(data.get("NeededTotalDays") or 0),
            current_days=int(data.get("CurrentTotalDays") or 0),
        )


@dataclass(frozen=True, slots=True)
class DayVisits:
    """The visit list and the per-cat summaries of one day."""

    visits: tuple[Visit, ...]
    summaries: Mapping[str, DaySummary]
    more: bool

    @classmethod
    def from_api(cls, data: Mapping[str, Any]) -> DayVisits:
        """Parse `Data` of `pet/toilet/event`."""
        summaries = (
            DaySummary.from_api(item) for item in data.get("TodaySummary") or ()
        )
        return cls(
            visits=tuple(Visit.from_api(item) for item in data.get("List") or ()),
            summaries={summary.pet_id: summary for summary in summaries},
            more=bool(data.get("More")),
        )


@dataclass(frozen=True, slots=True)
class AbnormalLabels:
    """Titles for abnormal codes from `Data.Memory.AbnormalToilet`."""

    shape: Mapping[int, str] = field(default_factory=dict)
    color: Mapping[int, str] = field(default_factory=dict)
    event: Mapping[int, str] = field(default_factory=dict)

    @classmethod
    def from_api(cls, data: Mapping[str, Any]) -> AbnormalLabels:
        """Parse `Data` of `config/system/config`. Code 0 means normal and is skipped."""
        groups: dict[str, dict[int, str]] = {"Shape": {}, "Color": {}, "Event": {}}
        for entry in (data.get("Memory") or {}).get("AbnormalToilet") or ():
            for group, labels in groups.items():
                for item in entry.get(group) or ():
                    code = int(item.get("Type") or 0)
                    title = str(item.get("Title") or "").strip()
                    if code > 0 and title:
                        labels[code] = title
        return cls(shape=groups["Shape"], color=groups["Color"], event=groups["Event"])

    def reasons(self, visit: Visit) -> list[str]:
        """Titles for the positive codes of an abnormal visit."""
        if not visit.abnormal:
            return []
        reasons: list[str] = []
        for index, code in enumerate(visit.feces_abnormal):
            if code is None or code <= 0:
                continue
            labels = self.shape if index == 0 else self.color
            reasons.append(labels.get(code, str(code)))
        if visit.event_abnormal > 0:
            reasons.append(
                self.event.get(visit.event_abnormal, str(visit.event_abnormal))
            )
        return reasons
