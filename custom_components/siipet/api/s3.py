"""SigV4 presigned GET URLs for the SiiPet media bucket."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
import hashlib
import hmac
from urllib.parse import quote

from .errors import SiiPetError
from .models import MediaCredentials

REGION = "us-east-1"
SERVICE = "s3"
ALGORITHM = "AWS4-HMAC-SHA256"
# Credentials are renewed this long before they expire, so that a new URL
# stays valid for at least this long.
REFRESH_MARGIN = timedelta(minutes=10)


def presign_get(
    credentials: MediaCredentials, key: str, *, now: datetime, expires_in: int
) -> str:
    """Return a SigV4 query-string presigned GET URL for one object."""
    now = now.astimezone(UTC)
    host = f"{credentials.bucket}.s3.amazonaws.com"
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    datestamp = now.strftime("%Y%m%d")
    scope = f"{datestamp}/{REGION}/{SERVICE}/aws4_request"
    params = {
        "X-Amz-Algorithm": ALGORITHM,
        "X-Amz-Credential": f"{credentials.access_key_id}/{scope}",
        "X-Amz-Date": amz_date,
        "X-Amz-Expires": str(expires_in),
        "X-Amz-SignedHeaders": "host",
    }
    if credentials.session_token:
        params["X-Amz-Security-Token"] = credentials.session_token
    query = "&".join(
        f"{_encode(name)}={_encode(value)}" for name, value in sorted(params.items())
    )
    path = "/" + quote(key.lstrip("/"), safe="/-_.~")
    canonical = "\n".join(
        ("GET", path, query, f"host:{host}\n", "host", "UNSIGNED-PAYLOAD")
    )
    string_to_sign = "\n".join(
        (ALGORITHM, amz_date, scope, hashlib.sha256(canonical.encode()).hexdigest())
    )
    signing_key = f"AWS4{credentials.secret_access_key}".encode()
    for part in (datestamp, REGION, SERVICE, "aws4_request"):
        signing_key = hmac.new(signing_key, part.encode(), hashlib.sha256).digest()
    signature = hmac.new(
        signing_key, string_to_sign.encode(), hashlib.sha256
    ).hexdigest()
    return f"https://{host}{path}?{query}&X-Amz-Signature={signature}"


def _encode(value: str) -> str:
    return quote(value, safe="-_.~")


class S3Signer:
    """Presign media URLs with temporary credentials that it caches."""

    def __init__(
        self,
        fetch: Callable[[], Awaitable[MediaCredentials]],
        *,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
    ) -> None:
        """Create a signer. `fetch` returns new credentials."""
        self._fetch = fetch
        self._clock = clock
        self._credentials: MediaCredentials | None = None
        self._lock = asyncio.Lock()

    async def async_presign(self, key: str, lifetime: timedelta) -> str:
        """Return a GET URL that lasts `lifetime`, or until the credentials expire."""
        credentials = await self._async_credentials()
        now = self._clock()
        seconds = int(min(lifetime, credentials.expires - now).total_seconds())
        if seconds < 1:
            raise SiiPetError("The media credentials expired")
        return presign_get(credentials, key, now=now, expires_in=seconds)

    def invalidate(self) -> None:
        """Drop the cached credentials, so that the next URL gets new ones."""
        self._credentials = None

    async def _async_credentials(self) -> MediaCredentials:
        async with self._lock:
            credentials = self._credentials
            if credentials is None or (
                self._clock() >= credentials.expires - REFRESH_MARGIN
            ):
                credentials = await self._fetch()
                self._credentials = credentials
            return credentials
