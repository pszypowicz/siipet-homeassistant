"""Tests for the MQTT 3.1.1 codec and session."""

from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator

import aiohttp
import pytest

from custom_components.siipet.api.mqtt import (
    DISCONNECT_PACKET,
    PINGREQ_PACKET,
    MqttError,
    MqttSession,
    Packet,
    PacketReader,
    encode_connect,
    encode_length,
    encode_publish,
    encode_subscribe,
    parse_connack,
    parse_publish,
    parse_suback,
)

from .fake_broker import FakeBroker, run_broker

# The session tests talk to a fake broker on localhost.
pytestmark = pytest.mark.usefixtures("socket_enabled")


@pytest.fixture(autouse=True)
def frozen_time() -> None:
    """Keep the real clock. The session waits on asyncio timers."""


@pytest.mark.parametrize(
    ("length", "encoded"),
    [
        (0, "00"),
        (127, "7f"),
        (128, "8001"),
        (16_383, "ff7f"),
        (16_384, "808001"),
        (2_097_151, "ffff7f"),
        (2_097_152, "80808001"),
        (268_435_455, "ffffff7f"),
    ],
)
def test_encode_length(length: int, encoded: str) -> None:
    """Lengths follow the table in section 2.2.3 of the MQTT 3.1.1 standard."""
    assert encode_length(length) == bytes.fromhex(encoded)


def test_encode_length_too_long() -> None:
    """A length above the MQTT limit is refused."""
    with pytest.raises(ValueError, match="too long"):
        encode_length(268_435_456)


def test_encode_connect() -> None:
    """CONNECT names MQTT level 4, asks for a clean session, and sends the keepalive."""
    assert encode_connect("c1", 60) == bytes.fromhex(
        "10 0e 0004 4d515454 04 02 003c 0002 6331"
    )


def test_encode_subscribe() -> None:
    """SUBSCRIBE sets flags 0010 and asks for QoS 0 on each topic."""
    assert encode_subscribe(1, ["a/b", "c"]) == bytes.fromhex(
        "82 0c 0001 0003 612f62 00 0001 63 00"
    )


def test_encode_publish() -> None:
    """A QoS 0 PUBLISH has no packet id."""
    assert encode_publish("a/b", b"{}") == bytes.fromhex("30 07 0003 612f62 7b7d")


def test_fixed_packets() -> None:
    """PINGREQ and DISCONNECT have no body."""
    assert bytes.fromhex("c000") == PINGREQ_PACKET
    assert bytes.fromhex("e000") == DISCONNECT_PACKET


def test_reader_joined_packets() -> None:
    """One frame can hold two packets."""
    assert PacketReader().feed(bytes.fromhex("20020000 d000")) == [
        Packet(2, 0, b"\x00\x00"),
        Packet(13, 0, b""),
    ]


def test_reader_split_packet() -> None:
    """A packet can arrive over several frames, even inside its length."""
    reader = PacketReader()
    payload = b"x" * 200
    data = encode_publish("t", payload)
    assert reader.feed(data[:1]) == []
    assert reader.feed(data[1:2]) == []
    assert reader.feed(data[2:50]) == []
    [packet] = reader.feed(data[50:])
    assert parse_publish(packet) == ("t", payload)


def test_reader_bad_length() -> None:
    """A remaining length of more than four bytes is refused."""
    with pytest.raises(MqttError, match="remaining length"):
        PacketReader().feed(bytes.fromhex("30 ffffffff01"))


def test_parse_publish_qos1_skips_packet_id() -> None:
    """A QoS 1 PUBLISH carries a packet id after the topic."""
    packet = Packet(3, 0b0010, bytes.fromhex("0003 612f62 0007 7b7d"))
    assert parse_publish(packet) == ("a/b", b"{}")


@pytest.mark.parametrize(
    "packet",
    [Packet(3, 0, b"\x00"), Packet(3, 0, b"\x00\x05ab"), Packet(3, 0, b"\x00\x01\xff")],
)
def test_parse_publish_malformed(packet: Packet) -> None:
    """A PUBLISH with a short body or a bad topic is refused."""
    with pytest.raises(MqttError, match="Malformed PUBLISH"):
        parse_publish(packet)


def test_parse_acks() -> None:
    """CONNACK gives its return code, and SUBACK its packet id and codes."""
    assert parse_connack(Packet(2, 0, b"\x00\x05")) == 5
    assert parse_suback(Packet(9, 0, b"\x00\x07\x00\x80")) == (7, (0, 0x80))
    with pytest.raises(MqttError):
        parse_connack(Packet(2, 0, b"\x00"))
    with pytest.raises(MqttError):
        parse_suback(Packet(9, 0, b"\x00\x07"))


@pytest.fixture
async def websession() -> AsyncIterator[aiohttp.ClientSession]:
    async with aiohttp.ClientSession() as session:
        yield session


async def _session(
    websession: aiohttp.ClientSession,
    url: str,
    messages: list[tuple[str, bytes]] | None = None,
) -> MqttSession:
    ws = await websession.ws_connect(url, protocols=("mqtt",))
    received = messages if messages is not None else []
    return MqttSession(ws, lambda topic, payload: received.append((topic, payload)))


async def test_session_subscribe_and_receive(
    websession: aiohttp.ClientSession,
) -> None:
    """The session connects, subscribes, and receives a published message."""
    broker = FakeBroker(deny_subscribe={"SN0002"})
    messages: list[tuple[str, bytes]] = []
    async with run_broker(broker) as url:
        session = await _session(websession, url, messages)
        await session.connect("id:1", 60, 1)
        granted = await session.subscribe(
            ["$aws/things/SN0001/x", "$aws/things/SN0002/x"], 1
        )
        assert granted == [True, False]
        await broker.push("$aws/things/SN0001/x", {"a": 1})
        await session.ping(1)
        assert messages == [("$aws/things/SN0001/x", b'{"a": 1}')]
        await session.close()
    [connection] = broker.connections
    assert connection.client_id == "id:1"
    assert connection.keepalive == 60
    assert connection.disconnected


async def test_session_connect_refused(websession: aiohttp.ClientSession) -> None:
    """A CONNACK with a non-zero code raises MqttError."""
    async with run_broker(FakeBroker(connack_code=5)) as url:
        session = await _session(websession, url)
        with pytest.raises(MqttError, match="code 5"):
            await session.connect("id:1", 60, 1)
        await session.close()


async def test_session_ping_timeout(websession: aiohttp.ClientSession) -> None:
    """No PINGRESP in time raises MqttError."""
    async with run_broker(FakeBroker(answer_ping=False)) as url:
        session = await _session(websession, url)
        await session.connect("id:1", 60, 1)
        with pytest.raises(MqttError, match="in time"):
            await session.ping(0.1)
        await session.close()


async def test_session_stalled_write_times_out() -> None:
    """A write that never finishes still ends the request at its deadline."""

    class StalledSocket:
        async def send_bytes(self, _data: bytes) -> None:
            await asyncio.Event().wait()

    session = MqttSession(StalledSocket(), lambda _topic, _payload: None)  # type: ignore[arg-type]
    with pytest.raises(MqttError, match="in time"):
        await session.ping(0.05)


async def test_session_close_by_broker(websession: aiohttp.ClientSession) -> None:
    """A close by the broker ends the session and fails later requests."""
    broker = FakeBroker(answer_ping=False)
    async with run_broker(broker) as url:
        session = await _session(websession, url)
        await session.connect("id:1", 60, 1)
        ping = asyncio.ensure_future(session.ping(5))
        await asyncio.sleep(0.05)
        await broker.close_all()
        with pytest.raises(MqttError, match="closed"):
            await ping
        assert await session.wait_closed(1)
        assert session.closed
        with pytest.raises(MqttError, match="closed"):
            await session.publish("t")
        await session.close()


async def test_session_wait_closed_timeout(websession: aiohttp.ClientSession) -> None:
    """wait_closed returns False when the connection stays open."""
    async with run_broker(FakeBroker()) as url:
        session = await _session(websession, url)
        await session.connect("id:1", 60, 1)
        assert not await session.wait_closed(0.05)
        await session.close()
