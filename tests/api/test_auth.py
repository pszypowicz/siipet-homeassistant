"""Tests for the SiiPet sign-in helpers."""

from __future__ import annotations

import base64

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import pytest

from custom_components.siipet.api import Session, SiiPetError
from custom_components.siipet.api.auth import (
    encrypt_challenge,
    needs_renewal,
    read_token_payload,
    session_from_token,
)
from custom_components.siipet.api.challenge_key import CHALLENGE_KEY

from ..common import load_data, make_token

TEST_KEY = bytes(range(32))
TEST_NONCE = bytes(range(12))
VERIFY_CODE = "0123456789abcdef0123456789abcdef"


def test_challenge_key_size() -> None:
    """The bundled key is an AES-256 key."""
    assert len(CHALLENGE_KEY) == 32


def test_encrypt_challenge_round_trip() -> None:
    """The output is base64 of nonce, ciphertext, and tag, and it decrypts."""
    raw = base64.b64decode(encrypt_challenge(VERIFY_CODE, key=TEST_KEY))
    assert len(raw) == 12 + len(VERIFY_CODE) + 16
    assert AESGCM(TEST_KEY).decrypt(raw[:12], raw[12:], None).decode() == VERIFY_CODE


def test_encrypt_challenge_fixed_nonce() -> None:
    """A fixed nonce gives the same output as a direct AES-GCM call."""
    expected = base64.b64encode(
        TEST_NONCE + AESGCM(TEST_KEY).encrypt(TEST_NONCE, VERIFY_CODE.encode(), None)
    ).decode()
    assert encrypt_challenge(VERIFY_CODE, key=TEST_KEY, nonce=TEST_NONCE) == expected
    assert len(expected) == 80


def test_encrypt_challenge_random_nonce() -> None:
    """Two calls use different nonces."""
    assert encrypt_challenge(VERIFY_CODE, key=TEST_KEY) != encrypt_challenge(
        VERIFY_CODE, key=TEST_KEY
    )


def test_read_token_payload() -> None:
    """The payload gives UserId and exp."""
    payload = read_token_payload(load_data("login.json")["Token"])
    assert payload == {"UserId": "user-0001", "exp": 1792972800}


@pytest.mark.parametrize("token", ["", "not-a-jwt", "a.!!!.c", "a.bnVsbA.c"])
def test_read_token_payload_invalid(token: str) -> None:
    """A token without a JSON object payload raises SiiPetError."""
    with pytest.raises(SiiPetError):
        read_token_payload(token)


def test_session_user_id() -> None:
    """The session reads UserId from its token."""
    data = load_data("login.json")
    assert Session(data["Token"], data["ExpireAt"]).user_id == "user-0001"


def test_session_from_token() -> None:
    """A token without its login response gets the ExpireAt of that response."""
    data = load_data("login.json")
    assert session_from_token(data["Token"]) == Session(data["Token"], data["ExpireAt"])


@pytest.mark.parametrize(
    "token", ["not-a-jwt", make_token("user-0001"), make_token("user-0001", "soon")]
)
def test_session_from_token_invalid(token: str) -> None:
    """A token without a numeric exp claim raises SiiPetError."""
    with pytest.raises(SiiPetError):
        session_from_token(token)


@pytest.mark.parametrize(
    ("now_ms", "expected"),
    [
        (1_000_000_000 - 86_400_000, False),
        (1_000_000_000 - 86_400_000 + 1, True),
        (1_000_000_000, True),
    ],
)
def test_needs_renewal(now_ms: int, expected: bool) -> None:
    """Renewal starts when less than one day remains before ExpireAt."""
    assert needs_renewal(1_000_000_000, now_ms) is expected
