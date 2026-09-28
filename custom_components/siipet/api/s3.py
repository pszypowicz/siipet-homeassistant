"""SigV4 presigned GET URLs for the SiiPet media bucket."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import UTC, datetime, timedelta
from urllib.parse import quote

from .errors import SiiPetError
from .models import MediaCredentials
from .sigv4 import presigned_query

REGION = "us-east-1"
SERVICE = "s3"
# Credentials are renewed this long before they expire, so that a new URL
# stays valid for at least this long.
REFRESH_MARGIN = timedelta(minutes=10)


def presign_get(
    credentials: MediaCredentials, key: str, *, now: datetime, expires_in: int
) -> str:
    """Return a SigV4 query-string presigned GET URL for one object."""
    host = f"{credentials.bucket}.s3.amazonaws.com"
    params = {"X-Amz-Expires": str(expires_in)}
    if credentials.session_token:
        params["X-Amz-Security-Token"] = credentials.session_token
    path = "/" + quote(key.lstrip("/"), safe="/-_.~")
    query = presigned_query(
        host=host,
        path=path,
        region=REGION,
        service=SERVICE,
        access_key_id=credentials.access_key_id,
        secret_access_key=credentials.secret_access_key,
        now=now,
        params=params,
        payload_hash="UNSIGNED-PAYLOAD",
    )
    return f"https://{host}{path}?{query}"


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
