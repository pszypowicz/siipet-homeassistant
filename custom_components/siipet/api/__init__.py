"""Client for the SiiPet cloud API. This package has no Home Assistant imports."""

from .errors import (
    SiiPetApiError,
    SiiPetAuthError,
    SiiPetConnectionError,
    SiiPetError,
)
from .models import (
    AbnormalLabels,
    Camera,
    Cat,
    DaySummary,
    DayVisits,
    Visit,
    VisitType,
)

__all__ = [
    "AbnormalLabels",
    "Camera",
    "Cat",
    "DaySummary",
    "DayVisits",
    "SiiPetApiError",
    "SiiPetAuthError",
    "SiiPetConnectionError",
    "SiiPetError",
    "Visit",
    "VisitType",
]
