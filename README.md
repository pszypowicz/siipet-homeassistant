# siipet-homeassistant

A Home Assistant custom integration for [SiiPet](https://siipet.com) LitterLens litter box cameras.

## Status

The integration is in early development. It signs in to your SiiPet account and polls the SiiPet cloud every 5 minutes.
It gives statistics and visit events for each cat. Recordings and visit edits come in a later version.

## Requirements

- Home Assistant 2026.9.0 or later.
- A SiiPet account with at least one camera.

## Install

1. Copy `custom_components/siipet/` from this repo into your Home Assistant config, so that the path is `/config/custom_components/siipet/`.
2. Restart Home Assistant.
3. Go to **Settings > Devices & Services > Add Integration** and search for **SiiPet**.
4. Enter the email address of your SiiPet account.
5. Enter the code that SiiPet sends to that address.

The session renews automatically. If SiiPet ends the session, Home Assistant asks you to sign in again.

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
actions:
  - action: notify.mobile_app_phone
    data:
      message: "A visit has no cat. Open the SiiPet app to assign it."
```

## License

MIT.
