"""Plans for one camera setting change, built from the reported state. No I/O.

The values and the confirmation fields copy the Android app: the fill light
and the motion sensitivity are written to the shadow `desired` and sent as a
realtime command with the same object, privacy mode only as a command. The
update mode is written to `desired` only, as in the app, and a wake command
follows, because a sleeping camera on battery does not read `desired`.
"""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from enum import StrEnum
from typing import Any, assert_never

from .errors import SettingUnavailableError
from .models import DeviceSettings, DeviceState

# The firmware feature that shows the fill light and motion settings in the app.
FEATURE_PIR_AND_FILL_LIGHT = "6"
FILL_LIGHT_LEVELS = (1, 2, 3)
MOTION_LEVELS = (2, 3)
# The app's values when `JOY1SystemConfig` has no entry for a level.
FILL_LIGHT_BRIGHTNESS_FALLBACK = 60
MOTION_SENSE_FALLBACK = {2: 75, 3: 60}
# `otaMode.mode` codes of the app. Code 2 means unknown.
UPDATE_MODE_AUTOMATIC = 0
UPDATE_MODE_MANUAL = 1
WAKE_COMMAND = "wakeup.lowpower"


class SettingGroup(StrEnum):
    """Settings that one change writes together. One change per group runs at a time."""

    FILL_LIGHT = "fill_light"
    MOTION = "motion"
    PRIVACY = "privacy"
    UPDATE_MODE = "update_mode"


@dataclass(frozen=True, slots=True)
class FillLightChange:
    """Change one field of the fill light."""

    level: int | None = None
    auto: bool | None = None
    night_vision: bool | None = None

    def __post_init__(self) -> None:
        """Allow exactly one field, and a level the app offers."""
        given = [v for v in (self.level, self.auto, self.night_vision) if v is not None]
        if len(given) != 1:
            raise ValueError("Set exactly one fill light field")
        if self.level is not None and self.level not in FILL_LIGHT_LEVELS:
            raise ValueError("The fill light level must be 1, 2, or 3")


@dataclass(frozen=True, slots=True)
class MotionChange:
    """Change the motion sensitivity level."""

    level: int

    def __post_init__(self) -> None:
        """Allow the levels the app offers."""
        if self.level not in MOTION_LEVELS:
            raise ValueError("The motion level must be 2 or 3")


@dataclass(frozen=True, slots=True)
class PrivacyChange:
    """Turn privacy mode on or off."""

    active: bool


@dataclass(frozen=True, slots=True)
class UpdateModeChange:
    """Turn automatic firmware updates on or off."""

    automatic: bool


type SettingChange = FillLightChange | MotionChange | PrivacyChange | UpdateModeChange


@dataclass(frozen=True, slots=True)
class PlannedChange:
    """What one change sends, and which reported fields confirm it.

    `needs_desired` is True when the command alone cannot make the change.
    """

    group: SettingGroup
    desired_key: str | None
    desired_value: Mapping[str, Any] | None
    command: str
    command_payload: Mapping[str, Any]
    expected: Mapping[str, Any]
    needs_desired: bool = False

    def __post_init__(self) -> None:
        """Keep the desired key and value together."""
        if (self.desired_key is None) != (self.desired_value is None):
            raise ValueError("Set the desired key and value together")
        if self.needs_desired and self.desired_key is None:
            raise ValueError("A change that needs desired must write it")


def group_of(change: SettingChange) -> SettingGroup:
    """Return the group that a change writes."""
    match change:
        case FillLightChange():
            return SettingGroup.FILL_LIGHT
        case MotionChange():
            return SettingGroup.MOTION
        case PrivacyChange():
            return SettingGroup.PRIVACY
        case UpdateModeChange():
            return SettingGroup.UPDATE_MODE
        case _:
            assert_never(change)


def needs_device_data(group: SettingGroup) -> bool:
    """True for the groups that need feature 6 and the device detail values."""
    return group in (SettingGroup.FILL_LIGHT, SettingGroup.MOTION)


def reports(state: DeviceState, expected: Mapping[str, Any]) -> bool:
    """True when the state reports every expected field value."""
    return all(getattr(state, name) == value for name, value in expected.items())


def plan_change(
    change: SettingChange, state: DeviceState, settings: DeviceSettings
) -> PlannedChange | None:
    """Plan a change. Return None when the camera already reports it.

    Raise SettingUnavailableError when a field that the change keeps is unknown.
    """
    match change:
        case FillLightChange():
            planned = _plan_fill_light(change, state, settings)
        case MotionChange():
            planned = _plan_motion(change, settings)
        case PrivacyChange():
            planned = PlannedChange(
                group=SettingGroup.PRIVACY,
                desired_key=None,
                desired_value=None,
                command="config.privacyMode",
                command_payload={"active": change.active},
                expected={"privacy": change.active},
            )
        case UpdateModeChange():
            planned = _plan_update_mode(change)
        case _:
            assert_never(change)
    return None if reports(state, planned.expected) else planned


def _plan_fill_light(
    change: FillLightChange, state: DeviceState, settings: DeviceSettings
) -> PlannedChange:
    level = change.level
    if level is None:
        level = _known(state.fill_light, "fill_light")
        if level not in FILL_LIGHT_LEVELS:
            raise SettingUnavailableError("fill_light")
    auto = change.auto
    if auto is None:
        auto = _known(state.fill_light_auto, "fill_light_auto")
    night_vision = change.night_vision
    if night_vision is None:
        night_vision = _known(state.fill_light_night_vision, "fill_light_night_vision")
    payload = {
        "level": level,
        "brightness2": settings.fill_light.get(level, FILL_LIGHT_BRIGHTNESS_FALLBACK),
        "autoLight": auto,
        "lowLight": night_vision,
    }
    return PlannedChange(
        group=SettingGroup.FILL_LIGHT,
        desired_key="fillLight",
        desired_value=payload,
        command="config.fillLight",
        command_payload=payload,
        expected={
            "fill_light": level,
            "fill_light_auto": auto,
            "fill_light_night_vision": night_vision,
        },
    )


def _plan_motion(change: MotionChange, settings: DeviceSettings) -> PlannedChange:
    sense = settings.pir.get(change.level, MOTION_SENSE_FALLBACK[change.level])
    payload = {"sense": sense, "level": change.level}
    return PlannedChange(
        group=SettingGroup.MOTION,
        desired_key="pir",
        desired_value=payload,
        command="config.pir.sense",
        command_payload=payload,
        expected={"motion_level": change.level},
    )


def _plan_update_mode(change: UpdateModeChange) -> PlannedChange:
    mode = UPDATE_MODE_AUTOMATIC if change.automatic else UPDATE_MODE_MANUAL
    return PlannedChange(
        group=SettingGroup.UPDATE_MODE,
        desired_key="otaMode",
        # Only the mode, as in the app. AWS IoT merges it, so the update
        # window in `start` and `end` stays.
        desired_value={"mode": mode},
        command=WAKE_COMMAND,
        command_payload={},
        expected={"update_mode": mode},
        needs_desired=True,
    )


def _known[T](value: T | None, name: str) -> T:
    if value is None:
        raise SettingUnavailableError(name)
    return value
