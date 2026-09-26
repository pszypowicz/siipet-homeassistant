"""Helpers shared by the SiiPet tests."""

from __future__ import annotations

import base64
import json
from pathlib import Path
from typing import Any

FIXTURES = Path(__file__).parent / "fixtures"
NOW = "2026-09-26T12:00:00+00:00"


def load_fixture(name: str) -> dict[str, Any]:
    """Return a JSON fixture as a dict. Fixtures hold full response envelopes."""
    return json.loads((FIXTURES / name).read_text())


def load_data(name: str) -> Any:
    """Return the `Data` part of a JSON fixture."""
    return load_fixture(name)["Data"]


def make_token(user_id: str) -> str:
    """Return an unsigned JWT with a UserId claim."""

    def part(value: dict[str, Any]) -> str:
        raw = json.dumps(value, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).decode().rstrip("=")

    return f"{part({'alg': 'HS256', 'typ': 'JWT'})}.{part({'UserId': user_id})}.sig"
