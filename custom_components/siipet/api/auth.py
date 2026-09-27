"""Sign-in helpers for the SiiPet API."""

from __future__ import annotations

import base64
import binascii
from dataclasses import dataclass
import json
import os
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from .challenge_key import CHALLENGE_KEY
from .errors import SiiPetError

NONCE_SIZE = 12
RENEW_MARGIN_MS = 86_400_000
# A login response reports `ExpireAt` 15 days before the `exp` claim of its token.
EXP_AFTER_EXPIRE_AT_MS = 15 * 86_400_000


def encrypt_challenge(
    verify_code: str, *, key: bytes = CHALLENGE_KEY, nonce: bytes | None = None
) -> str:
    """Encrypt a `VerifyCode` into the `VerifyCiphertext` format of the app.

    The result is base64 of the nonce, the ciphertext, and the 16-byte tag.
    """
    if nonce is None:
        nonce = os.urandom(NONCE_SIZE)
    sealed = AESGCM(key).encrypt(nonce, verify_code.encode(), None)
    return base64.b64encode(nonce + sealed).decode()


def read_token_payload(token: str) -> dict[str, Any]:
    """Decode the JWT payload. The signature is not checked."""
    try:
        part = token.split(".")[1]
        data = json.loads(base64.urlsafe_b64decode(part + "=" * (-len(part) % 4)))
    except (IndexError, ValueError, binascii.Error) as err:
        raise SiiPetError("The token has no readable payload") from err
    if not isinstance(data, dict):
        raise SiiPetError("The token payload is not an object")
    return data


def needs_renewal(expire_at_ms: int, now_ms: int) -> bool:
    """Return True when less than one day remains before `ExpireAt`."""
    return now_ms + RENEW_MARGIN_MS > expire_at_ms


@dataclass(frozen=True, slots=True)
class Session:
    """A signed-in session: the bearer token and its `ExpireAt` in milliseconds."""

    token: str
    expire_at: int

    @property
    def user_id(self) -> str:
        """The `UserId` claim of the token."""
        user_id = read_token_payload(self.token).get("UserId")
        if not user_id:
            raise SiiPetError("The token has no UserId")
        return str(user_id)


def session_from_token(token: str) -> Session:
    """Build a session for a token without its login response.

    `ExpireAt` is 15 days before the `exp` claim, as in a login response.
    """
    exp = read_token_payload(token).get("exp")
    if not isinstance(exp, int | float) or isinstance(exp, bool):
        raise SiiPetError("The token has no exp claim")
    return Session(token, int(exp * 1000) - EXP_AFTER_EXPIRE_AT_MS)
