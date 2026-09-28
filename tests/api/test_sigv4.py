"""Tests for the SigV4 URL of the AWS IoT WebSocket."""

from __future__ import annotations

from dataclasses import replace
from datetime import UTC, datetime

from custom_components.siipet.api import IotCredentials
from custom_components.siipet.api.sigv4 import iot_ws_url

from ..common import load_data

NOW = datetime(2026, 9, 26, 12, 0, tzinfo=UTC)
CREDENTIALS = IotCredentials.from_api(load_data("aws_auth.json"))
# Computed once with botocore's SigV4QueryAuth for iotdevicegateway in
# us-east-1, without X-Amz-Expires and without the session token.
SIGNED_QUERY = (
    "?X-Amz-Algorithm=AWS4-HMAC-SHA256"
    "&X-Amz-Credential=AKIDEXAMPLE%2F20260926%2Fus-east-1%2Fiotdevicegateway%2Faws4_request"
    "&X-Amz-Date=20260926T120000Z"
    "&X-Amz-SignedHeaders=host"
    "&X-Amz-Signature="
    "e614460f48d9a1b3a96c3cd4aae0ccb093eb2bc67d2cf706d0dfb17592802106"
)


def test_iot_ws_url() -> None:
    """The URL carries the botocore signature, and the token comes after it."""
    assert iot_ws_url(CREDENTIALS, NOW) == (
        "wss://example-ats.iot.us-east-1.amazonaws.com/mqtt"
        + SIGNED_QUERY
        + "&X-Amz-Security-Token=FwoGZXIvYXdzEXANPLE%2Ftoken%2Bpart%3D%3D"
    )


def test_iot_ws_url_without_token() -> None:
    """Without a session token, the URL ends with the signature."""
    url = iot_ws_url(replace(CREDENTIALS, session_token=""), NOW)
    assert url == "wss://example-ats.iot.us-east-1.amazonaws.com/mqtt" + SIGNED_QUERY
