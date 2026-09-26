"""Async client for the SiiPet cloud API."""

from __future__ import annotations

import asyncio
from collections.abc import Callable
from datetime import date
import logging
import time
from typing import Any

import aiohttp

from .auth import Session, encrypt_challenge, needs_renewal
from .errors import SiiPetApiError, SiiPetAuthError, SiiPetConnectionError
from .models import AbnormalLabels, Camera, Cat, DayVisits, Visit

_LOGGER = logging.getLogger(__name__)

BASE_URL = "https://api-siipet.linkric.com"
APP_VERSION = "2.1.5"
USER_AGENT = f"lc01-app/{APP_VERSION}"
DEVICE_MODEL = "Home Assistant"
# The header set copies the captured iOS app, which the API accepts.
DEVICE_OS = "iOS 27.0"
DEVICE_LANGUAGE = "en"
REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=30)

# Envelope codes that the vendor app treats as an ended session.
AUTH_ERROR_CODES: frozenset[int] = frozenset({-2, -4})
# Envelope code for a wrong email code at sign-in.
WRONG_CODE = 10004


class SiiPetClient:
    """Client for the SiiPet cloud API. Every call is a JSON POST."""

    def __init__(
        self,
        websession: aiohttp.ClientSession,
        *,
        client_id: str,
        time_zone: str,
        session: Session | None = None,
        on_session_update: Callable[[Session], None] | None = None,
        base_url: str = BASE_URL,
        clock: Callable[[], float] = time.time,
    ) -> None:
        """Create a client. `client_id` is sent as `x-device-identifier`."""
        self._websession = websession
        self._client_id = client_id
        self._time_zone = time_zone
        self._session = session
        self._on_session_update = on_session_update
        self._base_url = base_url
        self._clock = clock
        self._renew_lock = asyncio.Lock()

    @property
    def session(self) -> Session | None:
        """The current session, or None before sign-in."""
        return self._session

    async def request_email_code(self, email: str) -> None:
        """Solve the client challenge and ask the service to email a code."""
        challenge = await self._send("/api/v1/user/client/verify", {})
        await self._send(
            "/api/v1/user/email/send/trustworthy",
            {
                "Scene": 0,
                "ClientId": challenge["ClientId"],
                "VerifyCiphertext": encrypt_challenge(str(challenge["VerifyCode"])),
                "Email": email,
            },
        )

    async def login(self, email: str, code: str) -> Session:
        """Sign in with the emailed code and keep the new session."""
        data = await self._send(
            "/api/v1/user/email/register/login", {"Code": code, "Email": email}
        )
        self._session = Session(
            token=str(data["Token"]), expire_at=int(data["ExpireAt"])
        )
        return self._session

    async def get_cats(self) -> dict[str, Cat]:
        """Return the cats of the account by `PetId`."""
        data = await self._post("/api/v1/user/pet/sync", {})
        cats = (Cat.from_api(item) for item in data.get("List") or ())
        return {cat.pet_id: cat for cat in cats}

    async def get_cameras(self) -> dict[str, Camera]:
        """Return the cameras of the account by `SN`."""
        data = await self._post("/api/v1/user/device/sync", {})
        cameras = (Camera.from_api(item) for item in data.get("List") or ())
        return {camera.sn: camera for camera in cameras}

    async def get_day(self, day: date) -> DayVisits:
        """Return the visits and summaries of one day in the registered time zone."""
        data = await self._post(
            "/api/v1/pet/toilet/event",
            {
                "IncludeLocal": True,
                "FollowRegisterTimezone": True,
                "Date": f"{day.isoformat()} 00:00:00",
            },
        )
        return DayVisits.from_api(data or {})

    async def get_visit(self, event_id: str) -> Visit:
        """Return one visit with its media keys."""
        data = await self._post(
            "/api/v1/device/toilet/event/detail", {"EventId": event_id}
        )
        return Visit.from_api(data)

    async def get_abnormal_labels(self) -> AbnormalLabels:
        """Return the abnormal code titles from the system config."""
        data = await self._post("/api/v1/config/system/config", {})
        return AbnormalLabels.from_api(data or {})

    async def _post(self, path: str, body: dict[str, Any]) -> Any:
        """Send an authenticated request. Renew the session first when due."""
        session = await self._ensure_session()
        return await self._send(path, body, token=session.token)

    async def _ensure_session(self) -> Session:
        """Renew the token when less than one day remains before `ExpireAt`."""
        if self._session is None:
            raise SiiPetAuthError("No session. Sign in first.")
        if not needs_renewal(self._session.expire_at, self._now_ms()):
            return self._session
        async with self._renew_lock:
            if needs_renewal(self._session.expire_at, self._now_ms()):
                try:
                    await self._renew()
                except SiiPetConnectionError as err:
                    # The token stays valid past ExpireAt, so keep it and retry later.
                    _LOGGER.debug("Token renewal failed, retry later: %s", err)
        return self._session

    async def _renew(self) -> None:
        """Exchange the current token for a new one."""
        assert self._session is not None
        data = await self._send(
            "/api/v1/user/token/refresh", {}, token=self._session.token
        )
        self._session = Session(
            token=str(data["Token"]), expire_at=int(data["ExpireAt"])
        )
        if self._on_session_update is not None:
            self._on_session_update(self._session)

    async def _send(
        self, path: str, body: dict[str, Any], *, token: str | None = None
    ) -> Any:
        """POST one request and unwrap the response envelope."""
        headers = {
            "x-app-version": APP_VERSION,
            "x-device-identifier": self._client_id,
            "x-device-language": DEVICE_LANGUAGE,
            "x-device-model": DEVICE_MODEL,
            "x-device-os": DEVICE_OS,
            "x-timestamp": str(self._now_ms()),
            "x-timezone": self._time_zone,
            "user-agent": USER_AGENT,
        }
        if token is not None:
            headers["authorization"] = f"Bearer {token}"
        try:
            async with self._websession.post(
                f"{self._base_url}{path}",
                json=body,
                headers=headers,
                timeout=REQUEST_TIMEOUT,
            ) as response:
                if response.status in (401, 403):
                    raise SiiPetAuthError(f"HTTP {response.status} from {path}")
                if response.status >= 400:
                    raise SiiPetConnectionError(f"HTTP {response.status} from {path}")
                payload = await response.json(content_type=None)
        except (TimeoutError, aiohttp.ClientError) as err:
            raise SiiPetConnectionError(f"Request to {path} failed: {err}") from err
        except ValueError as err:
            raise SiiPetConnectionError(f"Response from {path} is not JSON") from err
        if not isinstance(payload, dict):
            raise SiiPetConnectionError(f"Response from {path} is not an object")
        code = int(payload.get("Code", -1))
        msg = str(payload.get("Msg") or "")
        if code in AUTH_ERROR_CODES:
            raise SiiPetAuthError(f"{code}: {msg}")
        if code != 0:
            raise SiiPetApiError(code, msg)
        return payload.get("Data")

    def _now_ms(self) -> int:
        return int(self._clock() * 1000)
