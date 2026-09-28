"""A lasting MQTT connection to AWS IoT that reads the device shadows of the cameras."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable, Mapping
from contextlib import suppress
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import json
import logging
from uuid import uuid4

import aiohttp

from .errors import SiiPetError
from .models import (
    CONFIG_SHADOW,
    SHADOW_KINDS,
    SYSTEM_SHADOW,
    CameraShadows,
    DeviceState,
    IotCredentials,
    ShadowPart,
    parse_shadow,
)
from .mqtt import MqttError, MqttSession
from .sigv4 import iot_ws_url

_LOGGER = logging.getLogger(__name__)

ACCEPTED = "get/accepted"
REJECTED = "get/rejected"
DOCUMENTS = "update/documents"
REPLIES = (ACCEPTED, REJECTED, DOCUMENTS)


@dataclass(frozen=True, slots=True)
class LinkTimings:
    """The waits of the link, in seconds unless the type says otherwise."""

    reply: float = 10.0
    keepalive: int = 60
    ping_timeout: float = 30.0
    read_interval: float = 300.0
    renew_margin: timedelta = timedelta(minutes=10)
    denied_retry: timedelta = timedelta(hours=1)
    backoff: tuple[float, ...] = (5.0, 30.0, 60.0, 120.0, 300.0)


@dataclass(frozen=True, slots=True)
class LinkStatus:
    """The state of the link for diagnostics. It holds no private value."""

    connected: bool
    connected_since: datetime | None
    last_message: datetime | None
    cameras_with_state: int
    denied_cameras: int


def shadow_topic(sn: str, shadow: str, suffix: str) -> str:
    """Return the MQTT topic of a named shadow operation."""
    return f"$aws/things/{sn}/shadow/name/{shadow}/{suffix}"


def _describe(err: BaseException) -> str:
    """Describe an error without its URL or other private text."""
    if isinstance(err, aiohttp.WSServerHandshakeError):
        return f"WebSocket handshake failed with HTTP {err.status}"
    if isinstance(err, SiiPetError):
        return str(err)
    if isinstance(err, TimeoutError):
        return "timeout"
    return type(err).__name__


def _rejected_code(payload: bytes) -> object:
    """Return the `code` of a rejected reply. Its message can name the shadow."""
    try:
        return json.loads(payload).get("code")
    except ValueError, AttributeError:
        return None


class ShadowLink:
    """Keep one MQTT connection open and report the device state of each camera.

    `on_state` and `on_connection` run in the event loop. After `stop()` the
    link calls neither of them.
    """

    def __init__(
        self,
        websession: aiohttp.ClientSession,
        fetch_credentials: Callable[[], Awaitable[IotCredentials]],
        on_state: Callable[[str, DeviceState], None],
        on_connection: Callable[[bool], None],
        label: Callable[[str], str],
        *,
        timings: LinkTimings | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        url: Callable[[IotCredentials, datetime], str] = iot_ws_url,
    ) -> None:
        """Create the link. `label` names a camera in logs."""
        self._websession = websession
        self._fetch_credentials = fetch_credentials
        self._on_state = on_state
        self._on_connection = on_connection
        self._label = label
        self._timings = timings or LinkTimings()
        self._clock = clock
        self._url = url
        self._credentials: IotCredentials | None = None
        self._cameras: dict[str, CameraShadows] = {}
        self._topics: dict[str, tuple[str, str, str]] = {}
        self._parts: dict[str, dict[str, ShadowPart]] = {}
        self._versions: dict[tuple[str, str], int] = {}
        self._pending: dict[tuple[str, str], asyncio.Future[None]] = {}
        self._started: set[str] = set()
        self._denied: dict[str, datetime] = {}
        self._denied_logged: set[str] = set()
        self._rejected_logged: set[tuple[str, str]] = set()
        self._starting: str | None = None
        self._session: MqttSession | None = None
        self._task: asyncio.Task[None] | None = None
        self._stopping = False
        self._connected = False
        self._connected_since: datetime | None = None
        self._last_message: datetime | None = None
        self._failures = 0
        self._warned = False

    @property
    def status(self) -> LinkStatus:
        """The state of the link for diagnostics."""
        return LinkStatus(
            connected=self._connected,
            connected_since=self._connected_since,
            last_message=self._last_message,
            cameras_with_state=len(self._parts),
            denied_cameras=len(self._denied),
        )

    def set_cameras(self, cameras: Mapping[str, CameraShadows]) -> None:
        """Replace the camera list.

        A new camera starts on the open connection within one keepalive. A
        removed camera loses its state at once.
        """
        for sn, shadows in list(self._cameras.items()):
            if cameras.get(sn) != shadows:
                self._forget(sn)
        self._cameras = dict(cameras)
        self._topics = {
            shadow_topic(sn, shadows.name(kind), suffix): (sn, kind, suffix)
            for sn, shadows in self._cameras.items()
            for kind in SHADOW_KINDS
            for suffix in REPLIES
        }

    async def run(self) -> None:
        """Keep the connection open until `stop()` or cancellation."""
        self._task = asyncio.current_task()
        while not self._stopping:
            try:
                await self._connection()
            except Exception as err:
                if self._stopping:
                    return
                if self._starting is not None:
                    self._deny(self._starting)
                    self._starting = None
                self._set_connected(False)
                backoff = self._timings.backoff
                delay = backoff[min(self._failures, len(backoff) - 1)]
                self._failures += 1
                if self._warned:
                    _LOGGER.debug(
                        "The device state connection failed again, next try in %s s: %s",
                        delay,
                        _describe(err),
                    )
                else:
                    _LOGGER.warning(
                        "The device state connection failed, next try in %s s: %s",
                        delay,
                        _describe(err),
                    )
                    self._warned = True
                await asyncio.sleep(delay)

    async def stop(self) -> None:
        """Close the connection and end `run()`."""
        self._stopping = True
        if self._session is not None:
            await self._session.close()
        task = self._task
        if task is not None and not task.done() and task is not asyncio.current_task():
            task.cancel()
            with suppress(asyncio.CancelledError):
                await task
        self._connected = False
        self._connected_since = None

    async def _connection(self) -> None:
        """Open one connection, start the cameras, and serve until it ends."""
        credentials = await self._current_credentials()
        async with asyncio.timeout(self._timings.reply):
            ws = await self._websession.ws_connect(
                self._url(credentials, self._clock()), protocols=("mqtt",)
            )
        session = MqttSession(ws, self._handle_message)
        self._session = session
        self._started.clear()
        try:
            await session.connect(
                f"{credentials.identity_id}:{uuid4().hex}",
                self._timings.keepalive,
                self._timings.reply,
            )
            await self._start_cameras(session)
            self._failures = 0
            if self._warned:
                _LOGGER.info("The device state connection works again")
                self._warned = False
            self._set_connected(True)
            await self._serve(session, credentials)
        finally:
            self._session = None
            await session.close()

    async def _current_credentials(self) -> IotCredentials:
        credentials = self._credentials
        if credentials is None or (
            self._clock() >= credentials.expires - self._timings.renew_margin
        ):
            credentials = await self._fetch_credentials()
            self._credentials = credentials
        return credentials

    async def _serve(self, session: MqttSession, credentials: IotCredentials) -> None:
        """Ping, read, and start cameras until the connection ends.

        Return for a planned reconnect before the credentials expire.
        """
        timings = self._timings
        loop = asyncio.get_running_loop()
        renew_at = max(
            credentials.expires - timings.renew_margin,
            self._clock() + timedelta(seconds=timings.read_interval),
        )
        next_read = loop.time() + timings.read_interval
        while True:
            wait = min(
                timings.keepalive,
                next_read - loop.time(),
                (renew_at - self._clock()).total_seconds(),
            )
            if await session.wait_closed(max(0.0, wait)):
                raise MqttError("The broker closed the connection")
            if self._clock() >= renew_at:
                return
            await session.ping(timings.ping_timeout)
            if loop.time() >= next_read:
                next_read = loop.time() + timings.read_interval
                await self._read_all(session)
            await self._start_cameras(session)

    async def _start_cameras(self, session: MqttSession) -> None:
        """Start each camera that is not started, unless it waits after a denial."""
        for sn in list(self._cameras):
            shadows = self._cameras.get(sn)
            if shadows is None or sn in self._started:
                # set_cameras can remove a camera while an earlier one starts.
                continue
            denied_at = self._denied.get(sn)
            if denied_at is not None and (
                self._clock() - denied_at < self._timings.denied_retry
            ):
                continue
            await self._start_camera(session, sn, shadows)

    async def _start_camera(
        self, session: MqttSession, sn: str, shadows: CameraShadows
    ) -> None:
        """Subscribe to the replies of both shadows, then read both.

        While this runs, a closed connection denies the camera.
        """
        self._starting = sn
        topics = [
            shadow_topic(sn, shadows.name(kind), suffix)
            for kind in SHADOW_KINDS
            for suffix in REPLIES
        ]
        if not all(await session.subscribe(topics, self._timings.reply)):
            self._deny(sn)
            self._starting = None
            return
        loop = asyncio.get_running_loop()
        replies: list[asyncio.Future[None]] = []
        for kind in SHADOW_KINDS:
            future: asyncio.Future[None] = loop.create_future()
            self._pending[(sn, kind)] = future
            replies.append(future)
        try:
            for kind in SHADOW_KINDS:
                await session.publish(shadow_topic(sn, shadows.name(kind), "get"))
            await self._wait_replies(session, replies)
        finally:
            for kind in SHADOW_KINDS:
                self._pending.pop((sn, kind), None)
        if self._cameras.get(sn) == shadows:
            # set_cameras can replace or remove the camera while it starts.
            self._denied.pop(sn, None)
            self._started.add(sn)
        self._starting = None

    async def _wait_replies(
        self, session: MqttSession, replies: list[asyncio.Future[None]]
    ) -> None:
        """Wait up to the reply timeout. Raise MqttError if the connection closes."""
        both = asyncio.gather(*replies)
        closed = asyncio.ensure_future(session.wait_closed())
        try:
            done, _pending = await asyncio.wait(
                {both, closed},
                timeout=self._timings.reply,
                return_when=asyncio.FIRST_COMPLETED,
            )
        finally:
            # A canceled gather keeps a CancelledError that must be read.
            for waiter in (both, closed):
                waiter.cancel()
                with suppress(asyncio.CancelledError):
                    await waiter
        if closed in done and closed.result():
            raise MqttError("The broker closed the connection")

    async def _read_all(self, session: MqttSession) -> None:
        """Read both shadows of each started camera again."""
        for sn in list(self._started):
            shadows = self._cameras.get(sn)
            if shadows is None:
                continue
            for kind in SHADOW_KINDS:
                await session.publish(shadow_topic(sn, shadows.name(kind), "get"))

    def _handle_message(self, topic: str, payload: bytes) -> None:
        if self._stopping:
            return
        target = self._topics.get(topic)
        if target is None:
            return
        sn, kind, suffix = target
        self._last_message = self._clock()
        if suffix == REJECTED:
            if (sn, kind) not in self._rejected_logged:
                self._rejected_logged.add((sn, kind))
                _LOGGER.debug(
                    "SiiPet rejected a %s shadow read of %s with code %s",
                    kind,
                    self._label(sn),
                    _rejected_code(payload),
                )
            self._resolve(sn, kind)
            return
        try:
            message = json.loads(payload)
        except ValueError:
            _LOGGER.debug("A shadow message of %s is not JSON", self._label(sn))
            message = None
        part = parse_shadow(kind, message)
        if part is not None and not self._stale(sn, kind, part):
            parts = self._parts.setdefault(sn, {})
            parts[kind] = part
            self._on_state(
                sn,
                DeviceState.from_parts(
                    parts.get(CONFIG_SHADOW), parts.get(SYSTEM_SHADOW)
                ),
            )
        if suffix == ACCEPTED:
            self._resolve(sn, kind)

    def _stale(self, sn: str, kind: str, part: ShadowPart) -> bool:
        """True for a document older than the last one of the same shadow."""
        if part.version is None:
            return False
        last = self._versions.get((sn, kind))
        if last is not None and part.version < last:
            return True
        self._versions[(sn, kind)] = part.version
        return False

    def _resolve(self, sn: str, kind: str) -> None:
        future = self._pending.get((sn, kind))
        if future is not None and not future.done():
            future.set_result(None)

    def _deny(self, sn: str) -> None:
        self._denied[sn] = self._clock()
        self._started.discard(sn)
        if sn in self._denied_logged:
            _LOGGER.debug(
                "SiiPet still refuses the device state of %s", self._label(sn)
            )
            return
        self._denied_logged.add(sn)
        _LOGGER.warning(
            "SiiPet refused the device state of %s. The next try is in %s",
            self._label(sn),
            self._timings.denied_retry,
        )

    def _forget(self, sn: str) -> None:
        self._parts.pop(sn, None)
        self._started.discard(sn)
        self._denied.pop(sn, None)
        self._denied_logged.discard(sn)
        for kind in SHADOW_KINDS:
            self._versions.pop((sn, kind), None)
            self._rejected_logged.discard((sn, kind))
            self._resolve(sn, kind)

    def _set_connected(self, connected: bool) -> None:
        if connected == self._connected:
            return
        self._connected = connected
        self._connected_since = self._clock() if connected else None
        if not self._stopping:
            self._on_connection(connected)
