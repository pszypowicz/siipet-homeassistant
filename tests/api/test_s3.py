"""Tests for the SiiPet media URL signer."""

from __future__ import annotations

import asyncio
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock

import pytest

from custom_components.siipet.api import MediaCredentials, SiiPetError
from custom_components.siipet.api.s3 import S3Signer, presign_get

from ..common import load_data

NOW = datetime(2026, 9, 26, 12, 0, tzinfo=UTC)
CREDENTIALS = MediaCredentials.from_api(load_data("aws_auth.json"))


def test_presign_aws_documentation_example() -> None:
    """The presigned URL example from the AWS documentation gives its signature."""
    credentials = MediaCredentials(
        bucket="examplebucket",
        access_key_id="AKIAIOSFODNN7EXAMPLE",
        secret_access_key="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
        session_token="",
        expires=datetime(2013, 5, 25, tzinfo=UTC),
    )
    url = presign_get(
        credentials,
        "test.txt",
        now=datetime(2013, 5, 24, tzinfo=UTC),
        expires_in=86400,
    )
    assert url == (
        "https://examplebucket.s3.amazonaws.com/test.txt"
        "?X-Amz-Algorithm=AWS4-HMAC-SHA256"
        "&X-Amz-Credential=AKIAIOSFODNN7EXAMPLE%2F20130524%2Fus-east-1%2Fs3%2Faws4_request"
        "&X-Amz-Date=20130524T000000Z"
        "&X-Amz-Expires=86400"
        "&X-Amz-SignedHeaders=host"
        "&X-Amz-Signature="
        "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404"
    )


def test_presign_with_session_token() -> None:
    """A session token is signed, and the key is encoded like botocore does it."""
    url = presign_get(
        CREDENTIALS, "toilet/2026/09/26/visit 1.mp4", now=NOW, expires_in=3600
    )
    # Computed once with botocore's S3SigV4QueryAuth for the same inputs.
    assert url.startswith(
        "https://media-bucket.s3.amazonaws.com/toilet/2026/09/26/visit%201.mp4?"
    )
    assert "&X-Amz-Security-Token=FwoGZXIvYXdzEXAMPLE%2Ftoken%2Bpart%3D%3D&" in url
    assert url.endswith(
        "&X-Amz-Signature="
        "0584d9c17e1c4dde8917e631b18b35e588e2ccf18c0b0b07ad31b38a0773e972"
    )


def _signer(
    clock: list[datetime], *credentials: MediaCredentials
) -> tuple[S3Signer, AsyncMock]:
    fetch = AsyncMock(side_effect=list(credentials))
    return S3Signer(fetch, clock=lambda: clock[0]), fetch


async def test_signer_caches_credentials() -> None:
    """Two URLs use one credentials call."""
    signer, fetch = _signer([NOW], CREDENTIALS)
    await signer.async_presign("events/ev-1/cover.jpg", timedelta(minutes=5))
    await signer.async_presign("events/ev-2/cover.jpg", timedelta(minutes=5))
    assert fetch.await_count == 1


async def test_signer_fetches_once_for_parallel_calls() -> None:
    """Parallel URLs wait for one credentials call."""
    signer, fetch = _signer([NOW], CREDENTIALS)
    await asyncio.gather(
        *(signer.async_presign(f"k{n}", timedelta(minutes=5)) for n in range(3))
    )
    assert fetch.await_count == 1


async def test_signer_refreshes_before_expiry() -> None:
    """Credentials are renewed 10 minutes before they expire."""
    clock = [NOW]
    signer, fetch = _signer(clock, CREDENTIALS, CREDENTIALS)
    await signer.async_presign("k", timedelta(minutes=5))
    clock[0] = CREDENTIALS.expires - timedelta(minutes=10, seconds=1)
    await signer.async_presign("k", timedelta(minutes=5))
    assert fetch.await_count == 1
    clock[0] = CREDENTIALS.expires - timedelta(minutes=10)
    await signer.async_presign("k", timedelta(minutes=5))
    assert fetch.await_count == 2


async def test_signer_caps_lifetime_at_expiry() -> None:
    """A URL does not outlive its credentials."""
    short = replace(CREDENTIALS, expires=NOW + timedelta(minutes=30))
    signer, _fetch = _signer([NOW], short)
    url = await signer.async_presign("k", timedelta(hours=1))
    assert "&X-Amz-Expires=1800&" in url


async def test_signer_invalidate() -> None:
    """After invalidate, the next URL gets new credentials."""
    signer, fetch = _signer([NOW], CREDENTIALS, CREDENTIALS)
    await signer.async_presign("k", timedelta(minutes=5))
    signer.invalidate()
    await signer.async_presign("k", timedelta(minutes=5))
    assert fetch.await_count == 2


async def test_signer_rejects_expired_credentials() -> None:
    """Credentials that expire now give no URL."""
    signer, _fetch = _signer([NOW], replace(CREDENTIALS, expires=NOW))
    with pytest.raises(SiiPetError):
        await signer.async_presign("k", timedelta(minutes=5))
