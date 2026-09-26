"""Tests for the integration metadata."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).parent.parent


def test_manifest() -> None:
    """The manifest declares a config flow with no extra requirements."""
    manifest = json.loads((ROOT / "custom_components/siipet/manifest.json").read_text())
    assert manifest["domain"] == "siipet"
    assert manifest["config_flow"] is True
    assert manifest["requirements"] == []
    assert manifest["version"] == "0.1.0"


def test_hacs_minimum_version() -> None:
    """HACS requires Home Assistant 2026.9.0 or later."""
    hacs = json.loads((ROOT / "hacs.json").read_text())
    assert hacs["homeassistant"] == "2026.9.0"
