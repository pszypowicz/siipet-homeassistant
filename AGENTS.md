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
    models.py          Cat, Camera, Visit, VisitType, DayVisits, DaySummary, AbnormalLabels, MediaCredentials
    edits.py           plan_edit: the annotate and memo calls for one visit edit
    errors.py          SiiPetError and its subclasses
    s3.py              SigV4 presigned GET URLs, credential cache
  __init__.py          setup of the image view and the actions, entry setup and unload, device removal
  config_flow.py       sign-in menu, email and code steps, token step, reauth menu
  const.py             constants: config keys, Unknown cat id, intervals
  coordinator.py       SiiPetCoordinator, SiiPetData, SiiPetRuntime
  entity.py            cat and camera entity bases
  sensor.py  event.py  diagnostics.py
  services.py          actions: list_visits, update_visit, delete_visit
  services.yaml        action fields and selectors
  media.py             SiiPetMedia: media keys, recording URLs, image fetch
  media_source.py      media browser: the last 30 days and their visits
  views.py             authenticated image view for covers, stool images, and avatars
  translations/en.json
  brand/               icon.png and icon@2x.png, loaded by Home Assistant 2026.3 and later
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
- `api/edits.py` has no I/O. `plan_edit` returns the calls, and `services.py` sends them.
- After an edit or a delete, `services.py` drops the day from the media cache and calls `async_refresh_day`.
- S3 credentials stay inside `api/`. Other modules get signed URLs from `S3Signer`.
- Only `media_source.py` returns a signed S3 URL, and only for a recording.
  Images go through the image view in `views.py`, so their signed URLs stay inside Home Assistant.

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
- The server checks `x-device-model`. Values that start with `iPhone` or `android-phone` work. With a rejected value, every authenticated call fails with `Code` -2. The `Msg` then says that another device logged in, but that is not the cause.
- Sign-in succeeds even with a rejected model, so the config flow reads the cats once before it creates the entry.
- Email code requests are limited per day (`Code` 10010).

## Privacy

This repo is public. Keep these values out of commits, tests, logs, and entity attributes:

- Tokens, emails, and passwords.
- Camera serial numbers, `UserId`, `GroupId`, `PetId`, and messaging topics.
- S3 credentials, the bucket name, media keys, and signed URLs.
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
