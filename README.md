# siipet-homeassistant

A Home Assistant custom integration for [SiiPet](https://siipet.com) LitterLens litter box cameras.

## Status

The integration is in early development. It signs in to your SiiPet account and polls the SiiPet cloud every 5 minutes.
It gives statistics and visit events for each cat, and it shows the cloud recordings in the media browser.
Its actions list, edit, and delete visits.

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
| Baseline visits, Baseline visit duration | The values that SiiPet expects for the cat from midnight until now, from what it learned.                  |
| Baseline progress                        | How much of the learning period is complete.                                                               |
| Last visit                               | The start of the newest visit. Its attributes show the type, duration, camera, and abnormal reasons.       |
| Visit                                    | An event entity. It fires once for each new visit, with the type `pee`, `poop`, `lingering`, or `unknown`. |
| Unassigned visits                        | Unknown cat only. The number of unrecognized visits in the last 7 days.                                    |

The Unknown cat has no baseline entities.

### Cameras

| Entity               | Description                         |
| -------------------- | ----------------------------------- |
| Subscription expires | The end of the camera subscription. |

### Removed cats and cameras

When a cat or a camera leaves your SiiPet account, its entities become unavailable.
To remove it, open its device page in Home Assistant and choose **Delete**.
Home Assistant does not let you delete a cat or a camera that is still in the account.
The delete works only while the SiiPet integration is loaded.

## Recordings

Open **Media** in the Home Assistant sidebar and choose **SiiPet**.
The list shows the last 30 days. Each day lists its visits, newest first, with the time, the cats, the type, and the duration.

The recordings use H.265 video. Safari and the Home Assistant app on macOS and iOS can play them.
Other browsers can fail. The integration does not convert video.

A visit marked **(on camera only)** has no cloud recording, so it cannot play.

Home Assistant fetches the thumbnails from the SiiPet cloud for you.
A recording plays directly from the SiiPet cloud storage, through a link that expires after one hour.

## Actions

Use the actions in scripts and automations, or in **Developer tools > Actions**.

### List visits

`siipet.list_visits` returns the visits of up to 7 days, newest first.

| Field  | Description                                                                         |
| ------ | ----------------------------------------------------------------------------------- |
| `date` | The last day in the list. The default is today. It must be one of the last 31 days. |
| `days` | The number of days, from 1 to 7. The default is 1.                                  |
| `cat`  | A cat device. The list then shows only the visits of that cat.                      |

The response has two lists.
`cats` gives the name and the device id of each cat, and of the Unknown cat.
`visits` gives the `event_id`, `start`, `duration` in seconds, `type`, `cats`, `camera`, `note`, `abnormal`, `abnormal_reasons`, `has_video`, and `has_stool_image` of each visit.

### Update visit

`siipet.update_visit` changes a visit in the SiiPet cloud. The SiiPet app shows the change too.

| Field      | Description                                                                               |
| ---------- | ----------------------------------------------------------------------------------------- |
| `event_id` | Required. The `event_id` from the list response, or from the attributes of a Visit event. |
| `cats`     | The cats that used the box, at least one. The Unknown cat is not valid here.              |
| `type`     | `pee`, `poop`, or `lingering`.                                                            |
| `note`     | The memo, up to 200 characters. An empty memo clears it.                                  |

Give at least one of `cats`, `type`, or `note`.
If the visit has the type `unknown`, give a `type` together with the cats.
A pee visit that you change to poop has no stool shape or color.

The integration reads the visit again after the change. If SiiPet did not apply the change, the action fails.
If an update fails partway, the error names the type to use. Check the visit, then call the action again with that type.
An edit does not fire a Visit event.

### Delete visit

`siipet.delete_visit` deletes the visit with the given `event_id`. Only an administrator can use it.

You cannot undo a delete.

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

## Example: assign unrecognized visits to your cat

If you have one cat, this automation gives it each visit that the camera did not recognize.
It skips visits of the type `unknown`, because those need a type too.
Replace `sensor.luna_visits_today` with a sensor of your cat.

```yaml
mode: queued
triggers:
  - trigger: state
    entity_id: event.unknown_cat_visit
    not_from: unavailable
    not_to: unavailable
conditions:
  - condition: template
    value_template: "{{ trigger.to_state.attributes.event_type != 'unknown' }}"
actions:
  - action: siipet.update_visit
    data:
      event_id: "{{ trigger.to_state.attributes.event_id }}"
      cats:
        - "{{ device_id('sensor.luna_visits_today') }}"
```

## License

MIT.
