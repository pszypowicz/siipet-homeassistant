# siipet-homeassistant

A Home Assistant custom integration for [SiiPet](https://siipet.com) LitterLens litter box cameras.

## Status

The integration is in early development. It signs in to your SiiPet account and polls the SiiPet cloud every 5 minutes.
It gives statistics and visit events for each cat. Recordings and visit edits come in a later version.

## Requirements

- Home Assistant 2026.9.0 or later.
- A SiiPet account with at least one camera.

## Install

Option 1: Install with HACS.

1. In Home Assistant, go to **HACS > Integrations**, open the three-dot menu, and choose **Custom repositories**.
2. Add `https://github.com/pszypowicz/siipet-homeassistant` with category **Integration**.
3. Find **SiiPet** in HACS and install it.
4. Restart Home Assistant.

Option 2: Copy the files by hand.

1. Copy `custom_components/siipet/` from this repo into your Home Assistant config, so that the path is `/config/custom_components/siipet/`.
2. Restart Home Assistant.

Then, for either option:

1. Go to **Settings > Devices & Services > Add Integration** and search for **SiiPet**.
2. Choose **Sign in with an email code**.
3. Enter the email address of your SiiPet account.
4. Enter the code that SiiPet sends to that address.

If you added SiiPet 0.0.1 before, remove that entry and add the integration again.

The session renews automatically. If SiiPet ends the session, Home Assistant asks you to sign in again. You can then choose either sign-in method.

SiiPet limits how many sign-in codes it sends per day. If it refuses, try again the next day, or sign in with an access token.

## Sign in with an access token

You can sign in with the access token of the SiiPet app instead of an email code.
You need a tool that shows the requests of the SiiPet app, for example a proxy app on your phone.

1. Find a request of the SiiPet app to `api-siipet.linkric.com`.
2. Copy the value after `Bearer` in the `authorization` header.
3. Copy the value of the `x-device-identifier` header from the same request.
4. In Home Assistant, add the integration and choose **Paste an access token**.
5. Paste both values.

Home Assistant then uses the same session and device identifier as the SiiPet app.
It renews the token automatically, on the same schedule as the SiiPet app.
It is not known yet if a renewal on one side ends the session on the other side.

Do not share the access token. It gives full access to your SiiPet account.

## Devices and entities

### Cats

Each cat is a device. A virtual device named **Unknown cat** collects visits that the camera did not recognize.

| Entity                                   | Description                                                                                                |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Visits today                             | Pee and poop visits today.                                                                                 |
| Pee today, Poop today, Lingering today   | Visits of each type today.                                                                                 |
| Abnormal visits today                    | Pee and poop visits that SiiPet marks as abnormal.                                                         |
| Average visit duration today             | The mean duration of today's pee and poop visits.                                                          |
| Baseline visits, Baseline visit duration | The normal values that SiiPet learned for the cat.                                                         |
| Baseline progress                        | How much of the learning period is complete.                                                               |
| Last visit                               | The start of the newest visit. Its attributes show the type, duration, camera, and abnormal reasons.       |
| Visit                                    | An event entity. It fires once for each new visit, with the type `pee`, `poop`, `lingering`, or `unknown`. |
| Unassigned visits                        | Unknown cat only. The number of unrecognized visits in the last 7 days.                                    |

The Unknown cat has no baseline entities.

### Cameras

| Entity               | Description                                     |
| -------------------- | ----------------------------------------------- |
| Connected            | Whether SiiPet reports the camera as connected. |
| Subscription expires | The end of the camera subscription.             |

## Example: notify on an unrecognized visit

```yaml
triggers:
  - trigger: state
    entity_id: event.unknown_cat_visit
    not_from: unavailable
    not_to: unavailable
actions:
  - action: notify.mobile_app_phone
    data:
      message: "A visit has no cat. Open the SiiPet app to assign it."
```

## License

MIT.
