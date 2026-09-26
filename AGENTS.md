# Instructions for coding agents

This file tells coding agents how to work in this repo. Humans can read it too.

## Project

This repo is a Home Assistant custom integration for SiiPet LitterLens litter box cameras.
It uses the SiiPet cloud API. HACS installs it from `custom_components/siipet/`.
The minimum Home Assistant version is 2026.9.0.

## Layout

```
custom_components/siipet/
  api/                 SiiPet cloud client. No Home Assistant imports.
    client.py          SiiPetClient: headers, envelope, one method per endpoint
    auth.py            challenge encryption, token payload, renewal rule
    challenge_key.py   AES key for the sign-in challenge
    models.py          Cat, Camera, Visit, DayVisits, DaySummary, AbnormalLabels
    errors.py          SiiPetError and its subclasses
  __init__.py          entry setup and unload
  config_flow.py       email step, code step, reauth
  coordinator.py       SiiPetCoordinator, SiiPetData, SiiPetRuntime
  entity.py            cat and camera entity bases
  sensor.py  binary_sensor.py  event.py  diagnostics.py
  translations/en.json
tests/
  api/                 client tests, with the Home Assistant HTTP mocker
  fixtures/            JSON responses with fake values only
docs/api.md            SiiPet cloud API reference
```

## Boundaries

- `api/` imports only `aiohttp`, `cryptography`, and the standard library.
  Home Assistant ships both packages, so `manifest.json` has no requirements.
- Entities read only `coordinator.data`. They never call the client.
- `SiiPetData.cat_ids(visit)` decides which cats own a visit.
  A visit with no known cat belongs to the virtual Unknown cat (`UNKNOWN_CAT_ID`).

## API facts that are easy to get wrong

Read `docs/api.md` before you change `api/`. These points cause most mistakes:

- Every call is a `POST` with a JSON body, also for reads.
- A response is `{"Code", "Msg", "Data"}`. `Code` 0 means success.
- Timestamps and durations are in milliseconds.
- Visit `Type`: 0 unknown, 1 lingering, 2 poop, 3 pee.
- The calendar counts only pee and poop. The visit counts in this integration use the same rule.
- A visit is abnormal when its type is pee or poop, and `FecesAbnormal` has a positive code or `EventAbnormal > 0`.
- `x-timezone` changes how the server groups visits into days.
- In the annotate call, `Result` is a JSON string, and the outer `Type` is the operation, not the visit type.
- Operation 2 of annotate with `GonePotty` true makes the app assume poop. A pee visit needs operation 3 after it.
- The recordings use H.265 video.

## Privacy

This repo is public. Keep these values out of commits, tests, logs, and entity attributes:

- Tokens, emails, and passwords.
- Camera serial numbers, `UserId`, `GroupId`, `PetId`, and messaging topics.
- S3 credentials, media keys, and signed URLs.
- Raw API captures. Build test fixtures from the documented shapes with fake values.

Entity attributes can contain cat names, camera names, event IDs, types, durations, and abnormal data.
When you add a field that holds a private value, add its key to `TO_REDACT` in `diagnostics.py`.

## Commands

Set up a Python 3.14 environment and install the test requirements:

```bash
python3.14 -m venv .venv
.venv/bin/pip install -r requirements_test.txt
```

Run the tests and the linters:

```bash
.venv/bin/pytest
.venv/bin/ruff check .
.venv/bin/ruff format --check .
```

## Tests

- Write the test first, then the code.
- Integration tests mock `SiiPetClient` with the fixtures in `tests/conftest.py`.
- Client tests mock HTTP with the `aioclient_mock` fixture.
- Tests run in UTC with the time frozen at 2026-09-26 12:00.

## Style

- Use American English.
- Do not use em dashes. Use a single `-`.
- Write docs and UI strings in short, plain sentences.
- Comments explain why. Do not restate the code.

## Live checks

Some API behavior is known only from the vendor app code. `docs/api.md` lists the open points.

- Read calls against a real account are safe.
- Edits and deletes change real data. Use only a visit that the account owner picks for tests.
- Record each result in `docs/api.md`.
