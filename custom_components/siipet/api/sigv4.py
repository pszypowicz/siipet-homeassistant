"""AWS Signature Version 4 for presigned URLs: S3 media and the AWS IoT WebSocket."""

from __future__ import annotations

from collections.abc import Mapping
from datetime import UTC, datetime
import hashlib
import hmac
from urllib.parse import quote

from .models import IotCredentials

ALGORITHM = "AWS4-HMAC-SHA256"
EMPTY_PAYLOAD_HASH = hashlib.sha256(b"").hexdigest()
IOT_SERVICE = "iotdevicegateway"
IOT_PATH = "/mqtt"


def encode(value: str) -> str:
    """Percent-encode a query name or value the way SigV4 expects."""
    return quote(value, safe="-_.~")


def signing_key(secret: str, datestamp: str, region: str, service: str) -> bytes:
    """Derive the SigV4 signing key for one day, region, and service."""
    key = f"AWS4{secret}".encode()
    for part in (datestamp, region, service, "aws4_request"):
        key = hmac.new(key, part.encode(), hashlib.sha256).digest()
    return key


def presigned_query(
    *,
    host: str,
    path: str,
    region: str,
    service: str,
    access_key_id: str,
    secret_access_key: str,
    now: datetime,
    params: Mapping[str, str],
    payload_hash: str,
) -> str:
    """Return the query string of a presigned GET, with the signature last."""
    now = now.astimezone(UTC)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    scope = f"{datestamp}/{region}/{service}/aws4_request"
    signed = {
        "X-Amz-Algorithm": ALGORITHM,
        "X-Amz-Credential": f"{access_key_id}/{scope}",
        "X-Amz-Date": amz_date,
        "X-Amz-SignedHeaders": "host",
        **params,
    }
    query = "&".join(
        f"{encode(name)}={encode(value)}" for name, value in sorted(signed.items())
    )
    canonical = "\n".join(("GET", path, query, f"host:{host}\n", "host", payload_hash))
    string_to_sign = "\n".join(
        (ALGORITHM, amz_date, scope, hashlib.sha256(canonical.encode()).hexdigest())
    )
    signature = hmac.new(
        signing_key(secret_access_key, datestamp, region, service),
        string_to_sign.encode(),
        hashlib.sha256,
    ).hexdigest()
    return f"{query}&X-Amz-Signature={signature}"


def iot_ws_url(credentials: IotCredentials, now: datetime) -> str:
    """Return the signed WebSocket URL for MQTT on AWS IoT.

    The session token goes after the signature. AWS IoT does not sign it.
    """
    query = presigned_query(
        host=credentials.endpoint,
        path=IOT_PATH,
        region=credentials.region,
        service=IOT_SERVICE,
        access_key_id=credentials.access_key_id,
        secret_access_key=credentials.secret_access_key,
        now=now,
        params={},
        payload_hash=EMPTY_PAYLOAD_HASH,
    )
    if credentials.session_token:
        query += f"&X-Amz-Security-Token={encode(credentials.session_token)}"
    return f"wss://{credentials.endpoint}{IOT_PATH}?{query}"
