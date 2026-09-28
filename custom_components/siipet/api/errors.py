"""Errors raised by the SiiPet API client."""

from __future__ import annotations


class SiiPetError(Exception):
    """Base class for SiiPet API errors."""


class SiiPetConnectionError(SiiPetError):
    """The request timed out or the connection failed."""


class SiiPetApiError(SiiPetError):
    """The API returned a non-zero code."""

    def __init__(self, code: int, msg: str) -> None:
        """Keep the code and the message from the response envelope."""
        super().__init__(f"SiiPet API error {code}: {msg}")
        self.code = code
        self.msg = msg


class SiiPetAuthError(SiiPetError):
    """The API rejected the session token."""
