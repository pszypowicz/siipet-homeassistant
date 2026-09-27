"""Client for the SiiPet cloud API. This package has no Home Assistant imports."""

from .auth import Session, session_from_token
from .client import SiiPetClient
from .errors import (
    SiiPetApiError,
    SiiPetAuthError,
    SiiPetConnectionError,
    SiiPetError,
)
from .models import (
    AbnormalLabels,
    CalendarDay,
    Camera,
    Cat,
    DaySummary,
    DayVisits,
    MediaCredentials,
    Visit,
    VisitType,
)

__all__ = [
    "AbnormalLabels",
    "CalendarDay",
    "Camera",
    "Cat",
    "DaySummary",
    "DayVisits",
    "MediaCredentials",
    "Session",
    "SiiPetApiError",
    "SiiPetAuthError",
    "SiiPetClient",
    "SiiPetConnectionError",
    "SiiPetError",
    "Visit",
    "VisitType",
    "session_from_token",
]
