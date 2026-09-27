# SiiPet LitterLens cloud API

Observed from iOS app sessions with app version 2.1.5.
These notes also use static inspection of Android app version 2.1.1.
Static inspection reads program code without running the app.

Examples use placeholders and sample values. Replace them with real values at runtime.

## Transport

- Base URL: `https://api-siipet.linkric.com`
- Every call is a `POST`, even a pure read.
- Request and response bodies are JSON.
- The app does not pin its certificate. A normal HTTPS client works.
- No request signature header is present.

## Response envelope

Every response uses the same shape.

```json
{ "Code": 0, "Msg": "success", "Data": {} }
```

`Code` is 0 on success. Treat any other value as an error and read `Msg`.

## Request headers

```
authorization: Bearer <token>
content-type: application/json
x-app-version: 2.1.5
x-device-identifier: <client UUID, stable per install>
x-device-language: en
x-device-model: <device name>
x-device-os: iOS 27.0
x-timestamp: <milliseconds since epoch>
x-timezone: <IANA timezone>
user-agent: lc01-app/2.1.5
```

The server checks `x-device-model`. Live tests show that it accepts values that
start with `iPhone` or `android-phone`, and rejects the other values that were
tested. The iOS app sends the device name, for example `iPhone 16 Pro`. The
Android app sends `android-phone <model>`. With a rejected value, sign-in still
succeeds, but every authenticated call fails with envelope `Code` -2. The
integration sends `android-phone Home Assistant`.

A bearer token grants access to whoever holds it. The app sends the bearer token
from `Data.Token` in the login response. That response reports `ExpireAt` about
15 days after sign-in. The token itself contains an expiration about 30 days
after sign-in. Android uses `ExpireAt` to schedule renewal before the encoded
token expiration.

`x-timezone` matters. The visit list groups by day, and the server honors the
registered timezone.

## Endpoints

| Endpoint                              | Purpose                                          |
| ------------------------------------- | ------------------------------------------------ |
| `/api/v1/user/account/logout`         | Sign out of the account.                         |
| `/api/v1/user/client/verify`          | Request a client challenge.                      |
| `/api/v1/user/email/send/trustworthy` | Request an email code.                           |
| `/api/v1/user/email/register/login`   | Sign in with an email code.                      |
| `/api/v1/user/token/refresh`          | Renew the session with its existing token.       |
| `/api/v1/user/app/init`               | Session bootstrap.                               |
| `/api/v1/user/account/detail`         | Account profile.                                 |
| `/api/v1/user/account/edit`           | Update the account profile.                      |
| `/api/v1/user/pet/sync`               | List the cats.                                   |
| `/api/v1/user/device/sync`            | List the cameras.                                |
| `/api/v1/pet/toilet/event`            | List visits for one day, with a per-cat summary. |
| `/api/v1/device/toilet/event/detail`  | Read one recording and its metadata.             |
| `/api/v1/pet/toilet/event/annotate`   | Edit cat assignment or event classification.     |
| `/api/v1/pet/toilet/data/calendar`    | Per-day history for charts.                      |
| `/api/v1/config/system/config`        | Client configuration. Called often.              |
| `/api/v1/config/aws/auth`             | Credentials for the media bucket.                |
| `/api/v1/user/firebase/token/bind`    | Push notification registration.                  |

### Email sign-in

The captured sign-in uses an email address and a code from an email.
The app makes three requests in this order. All three responses return HTTP 200
and `Code: 0`.

1. Send `{}` to `POST /api/v1/user/client/verify`.
2. Send the email request below to `POST /api/v1/user/email/send/trustworthy`.
3. Send the email address and received code to `POST /api/v1/user/email/register/login`.

The first response contains `Data.ClientId` and `Data.VerifyCode`.
A challenge is server data that the client must process.
The next request copies `ClientId` and supplies the encrypted `VerifyCode` as
`VerifyCiphertext`. Android constructs this value in
`LoginVerificationViewMode.sendCodeVerify` with `AESUtil.encryptAES`.
The same transformation reproduces the ciphertext in the captured iPhone request.

```json
{
  "Scene": 0,
  "ClientId": "<client id from the challenge response>",
  "VerifyCiphertext": "<processed challenge>",
  "Email": "<email address>"
}
```

AES-GCM encrypts data and detects changes to it. The app uses AES-GCM with a
32-byte key and a 16-byte authentication tag. The key is the SHA-256 digest of
the UTF-8 bytes of a bundled application constant.

A nonce is a random value used once. The app generates a 12-byte nonce for each
encryption. It encrypts the UTF-8 bytes of `VerifyCode` with no additional
authenticated data. It concatenates the nonce, ciphertext, and authentication tag,
then encodes the result with standard base64. Base64 represents bytes as text.

The observed `VerifyCode` contains 32 hexadecimal characters. The app encrypts
those characters directly, without decoding them as hexadecimal bytes.
The observed `VerifyCiphertext` contains 80 base64 characters that decode to
60 bytes. Decryption of the captured iPhone value produces its original challenge.
Encryption with the captured nonce reproduces the complete ciphertext and tag.

The final request has this body. `Code` is a string, so leading zeros remain
intact. The response contains `Data.Token` and `Data.ExpireAt`.

```json
{
  "Code": "<code from the email>",
  "Email": "<email address>"
}
```

The Unix epoch starts at 1970-01-01 00:00:00 UTC.
`ExpireAt` is a timestamp in milliseconds since the Unix epoch.
The captured value is about 15 days after the login response. Subsequent app
requests use the new token successfully.

All three captured iPhone login requests retain the previous token in their
`Authorization` header. A separate test uses a new client identifier and omits
both `Authorization` and `Cookie` for all three sign-in requests. The challenge,
email request, and final login each return HTTP 200 and `Code: 0`.
The final login uses a fresh code from the email and returns a token for the
expected account.

A subsequent `POST /api/v1/user/pet/sync` request uses the new token and returns
HTTP 200 and `Code: 0`. The new session reports an `ExpireAt` about 15 days after
login and an encoded token expiration about 30 days after login. This test
establishes a complete email-code sign-in without a prior session.

The captured login response has no refresh token field.
A refresh token is a credential for obtaining another access token.
Android supports automatic renewal with the existing access token, as described
below.

### Session renewal

A JWT is a token with signed data. The access token uses this format and contains
`UserId` and `exp` in its decoded payload. The `exp` value uses seconds since the
Unix epoch. This inspection reads the payload without authenticating its signature.

For the captured email login, `exp` is about 30 days after sign-in. It is exactly
15 days later than `Data.ExpireAt` in the same response. These timestamps alone
do not establish the lifetime that the server enforces.

The Android package `com.linkric.siipetapp` contains `UserRepository.checkUserLoginToken`.
The inspected version is 2.1.1.
That method requests renewal when `now_ms + 86_400_000 > ExpireAt`.
It skips renewal while another renewal request is in progress. With the observed
15-day `ExpireAt`, this condition becomes true about 14 days after sign-in.

`AppApi.refreshLoginToken` declares `POST /api/v1/user/token/refresh`.
`UserRepository.refreshToken` sends an empty `BaseRequest`, which corresponds to
the JSON body `{}`. `TokenInterceptor` supplies `Authorization: Bearer <existing token>`.
This Android flow sends no separate refresh token or email code.

`RefreshTokenResponse` contains `Token` and `ExpireAt`. On success, the app
replaces both values in its stored account data and updates the token in memory.
`MainViewModel.checkUserLoginToken` calls the renewal scheduler.

The endpoint, body, and Android scheduling condition come from app code.
A direct API test also succeeds with the captured iPhone access token.
The iPhone renewal timing remains unobserved.

The test sends `{}` to `POST /api/v1/user/token/refresh` with the existing bearer
token and the captured app headers. The response returns HTTP 200 and `Code: 0`.
`Data` contains a different `Token` and a new `ExpireAt`. The new `ExpireAt` is
about 15 days after renewal, and the new token contains an expiration about
30 days after renewal.

Subsequent `POST /api/v1/user/pet/sync` requests succeed with both the renewed
token and the previous token. Both responses return HTTP 200 and `Code: 0`.
The renewal requires no email code in this test. Continued validity of the
previous token beyond these immediate reads remains untested.

The token used before logout has about 28.8 days until its encoded expiration.
It has no issuance timestamp, so the capture cannot establish when the app
obtained it.

The captured iPhone activity contains no automatic renewal exchange. The direct
API renewal test appears separately in the same capture. The captured
`/api/v1/user/app/init` responses contain an empty `Data` object. The inspected
responses do not supply replacement access tokens through headers or cookies.

The `/api/v1/config/aws/auth` response includes a different `Data.Token`.
That token has about 10 hours until its encoded expiration. Its expiration
matches the other credentials in the response. The app does not use this token
as the main API authorization token in either capture.

### List the cats

`POST /api/v1/user/pet/sync` with an empty body `{}`.

```json
{
  "UserId": "<user id>",
  "Bucket": "<media bucket name>",
  "More": false,
  "Track": "",
  "List": [
    {
      "Id": 1,
      "PetId": "<pet id>",
      "GroupId": "<group id>",
      "Name": "<cat name>",
      "PetType": 0,
      "Type": 1,
      "Gender": 0,
      "Birth": 0,
      "avatar": { "Url": "resources/<hash>.jpg", "Width": 402, "Height": 402 },
      "CreateTime": 946684800000,
      "UpdateTime": 946771200000,
      "Role": 1,
      "Joy1AnnotationStatus": true
    }
  ]
}
```

`PetId` is the identifier the reassignment call takes. `Track` and `More` look
like a cursor for paging.

### List cameras

`POST /api/v1/user/device/sync` with `{}`.

The captured requests and a direct test return HTTP 200 and `Code: 0`.
The direct test uses the signed-in account token and the headers described above.
`Data` contains these fields.

| Field                   | Type    | Meaning                                                     |
| ----------------------- | ------- | ----------------------------------------------------------- |
| `List`                  | Array   | Cameras accessible to the account.                          |
| `More`                  | Boolean | Paging indicator. The tested response contains `false`.     |
| `Track`                 | String  | Paging state. The tested response contains an empty string. |
| `UserId`                | String  | Account identifier field. Empty in the tested response.     |
| `UserGroupList`         | Array   | Household membership and access information.                |
| `UserPurchaseSubscribe` | Object  | Account subscriptions indexed by product code.              |

Each entry in `List` contains these fields.

| Field                 | Type            | Meaning                                                       |
| --------------------- | --------------- | ------------------------------------------------------------- |
| `Id`                  | Integer         | Internal record identifier.                                   |
| `SN`                  | String          | Camera serial number. Recording events reference this value.  |
| `DeviceName`          | String          | Camera display name.                                          |
| `ProductId`           | String          | Model code. The tested records use `JOY1`.                    |
| `ProductType`         | String          | Product family. The tested records use `joy`.                 |
| `Role`                | Integer         | Account role for this camera. See the codes below.            |
| `BindTime`            | Integer         | Binding time in milliseconds since the Unix epoch.            |
| `UpdateTime`          | Integer         | Update time in milliseconds since the Unix epoch.             |
| `Connected.Status`    | Boolean         | Connection status reported by the service.                    |
| `Connected.Timestamp` | Integer         | Connection timestamp field. The tested values are zero.       |
| `Pet`                 | Array           | Cat records associated with this camera.                      |
| `Setting`             | Object          | Camera configuration returned by this endpoint.               |
| `PurchaseSubscribe`   | Object          | Camera subscription information.                              |
| `Subscribe`           | Null in samples | Additional subscription field with an unknown non-null shape. |
| `Topic`               | Object          | Messaging topics for this camera.                             |
| `AgoraAuth`           | Object          | Credentials for live video and device replay.                 |

Use `SN` to connect a recording to its camera.
All events in the comparison test resolve to a camera through this field.
Android defines model codes `LC01`, `LC02`, and `JOY1` in `DeviceProductType`.
These codes match `ProductId`. Preserve the separate `ProductType` family value.

Android `RoleType` defines `1` as owner, `2` as invitee, and `999` as other.
Only the owner role appears in the inspected responses.
Shared-account permissions remain untested.
The zero `Connected.Timestamp` samples do not establish its timestamp unit or update behavior.

Embedded `Pet` records include `PetId`, `Name`, `PetType`, `Type`, `Gender`, `Birth`, and `Breed`.
They also include `Id`, `GroupId`, `SN`, `Role`, `CreateTime`, and `UpdateTime`.
Their Boolean fields are `DetectSuccess`, `SNBind`, and `Joy1AnnotationStatus`.
Their lowercase `avatar` object contains `Url`, `Width`, `Height`, and `Size`.
Resolve these records against `/api/v1/user/pet/sync` through `PetId`.

The observed `Setting.Notification` object contains Boolean fields `AbnormalAlert` and `Highlight`.
This read does not establish how to change those values.
It also does not supply a complete device configuration or firmware status.

#### Subscription and household fields

Both `PurchaseSubscribe` and entries under `UserPurchaseSubscribe` contain the fields below.
The observed account-level entry uses the key `JOY1`.
Subscription codes remain unmapped.

| Fields                                                    | Type    | Meaning                                                       |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------- |
| `GoodsId`, `NextGoodsId`, `SubscribeId`                   | String  | Product and subscription identifiers.                         |
| `ExpireTime`, `FirstSubscribeTime`, `RetentionExpireTime` | Integer | Subscription timestamps in milliseconds since the Unix epoch. |
| `PurchaseMode`, `SubscribeStatus`, `SubscribeType`        | Integer | Service codes with unconfirmed meanings.                      |

Each `UserGroupList` entry contains `GroupId`, `Role`, `Owner`, and `Member`.
`Owner` is an object, and `Member` is an array of account objects.
These objects include `UserId`, `Name`, `Avatar`, `Email`, `EmailBind`, `Phone`, and `DialCode`.
They also contain integer fields `LoginType`, `Status`, and `LastActiveTimestamp`.
Nonzero activity timestamps use milliseconds since the Unix epoch.
The observed `Avatar` values are null.

#### Messaging and video credentials

`Topic.Publish` and `Topic.Receive` contain arrays of topic strings.
`Topic.Shadow` contains strings named `configInfo` and `systemInfo`.
A shadow stores device state in the cloud.
The camera list supplies the topic names without their state documents.

`AgoraAuth` contains `AppId`, `RoomId`, `Token`, `Uid`, `RemoteUid`, and `ExpireTime`.
Its `Live` and `Replay` objects contain the same fields plus `IotAuth`.
Each `IotAuth` object contains `Token` and `ExpireTime`.
The identifiers `Uid` and `RemoteUid` are integers. Other identifiers and tokens are strings.
Nonzero expiration values use milliseconds since the Unix epoch.

Some nested fields contain empty strings or zero expiration values.
The presence of these credentials does not establish a working live stream or device replay session.
Those media paths remain untested.
Keep tokens, account details, and private topic names out of logs and entity attributes.

Camera paging remains untested because the inspected responses contain `More: false` and an empty `Track`.
The tested request body is `{}`. A request schema for continuation remains unknown.

### List visits for a day

`POST /api/v1/pet/toilet/event`

```json
{
  "IncludeLocal": true,
  "FollowRegisterTimezone": true,
  "Date": "2000-01-01 00:00:00"
}
```

`Data.TodaySummary` holds one entry per cat.

| Field              | Meaning                                    |
| ------------------ | ------------------------------------------ |
| `PottyTimes`       | Visit count for the day.                   |
| `PottyAvgTime`     | Average visit duration in milliseconds.    |
| `BaselineTimes`    | The cat's normal visit count.              |
| `BaselineAvgTime`  | The cat's normal duration in milliseconds. |
| `NeededTotalDays`  | Days of data the baseline needs.           |
| `CurrentTotalDays` | Days of data collected so far.             |

`Data.List` holds one entry per visit.

| Field                 | Meaning                                                         |
| --------------------- | --------------------------------------------------------------- |
| `EventId`             | Visit identifier, a UUID. The reassignment call takes it.       |
| `PetId`               | The assigned cat.                                               |
| `PetIds`              | The assigned cats as an array. Reassignment writes this.        |
| `GroupId`             | Household identifier.                                           |
| `SN`                  | Camera serial number.                                           |
| `EventTimestamp`      | Visit start, milliseconds since epoch.                          |
| `Duration`            | Visit length in milliseconds.                                   |
| `Type`                | Event classification. See the values below.                     |
| `Note`                | Free text note, empty by default.                               |
| `CloudStorageStatus`  | Cloud storage flag.                                             |
| `LocalStorageStatus`  | Local storage flag.                                             |
| `TimestampAccurate`   | Timestamp accuracy flag.                                        |
| `EventAbnormal`       | Event abnormality code. The captured value is `0`.              |
| `FecesAbnormal`       | List of stool abnormality codes, or `null`.                     |
| `LabelPetIds`         | Additional cat labels. Their meaning remains unconfirmed.       |
| `ToiletVideo.Cover`   | Thumbnail object with `Url`, `Width`, `Height`, and `Size`.     |
| `ToiletVideo.RawInfo` | Video object. See the media section.                            |
| `FecesImage`          | Optional stool image with `Url`, `Width`, `Height`, and `Size`. |
| `UserAnnotation`      | Flags named `FecesError`, `MultiPet`, and `ToiletError`.        |

Resolve `PetId` and `PetIds` against the cat list to show names and avatars.
Preserve an unassigned or unknown cat when an identifier has no matching cat.
The response also contains `More` and `Track`. History paging remains untested.

### Event classification

Android defines these values in `PottyType`.

| `Type` | Android name | Meaning                 |
| ------ | ------------ | ----------------------- |
| `0`    | `UNKNOWN`    | Unknown classification. |
| `1`    | `STAY`       | Lingering.              |
| `2`    | `POTTY`      | Poop.                   |
| `3`    | `URINE`      | Pee.                    |

Android maps `POTTY` to the poop labels in its interface.
Its `PottyEvent.isPottyEvent` method treats both `2` and `3` as litter box use.
Keep `0` as unknown. Do not infer pee from a missing stool image.

Abnormality is separate from this classification.
Android marks a pee or poop event as abnormal when `FecesAbnormal` contains a positive value.
One captured poop event contains a stool image and `FecesAbnormal: [0, 0]`.
The complete meanings of the abnormality codes remain unknown.

All captured event examples use `Type: 2`. The other classification values come
from Android code and still need comparison with live examples.

### Read one recording

`POST /api/v1/device/toilet/event/detail`

```json
{
  "EventId": "<event id>"
}
```

The direct test returns HTTP 200 and `Code: 0`.
`Data` contains the same recording and metadata fields as an entry in the event list.
The endpoint uses `device` in its path.

### Edit a visit

`POST /api/v1/pet/toilet/event/annotate`

```json
{
  "EventId": "<event id>",
  "Result": "{\"PetIds\":[\"<pet id>\"],\"GonePotty\":true,\"Manual\":true}",
  "Type": 2
}
```

`Result` is a JSON object encoded as a string. Do not send it as a nested object.

| Field in `Result` | Meaning                                                               |
| ----------------- | --------------------------------------------------------------------- |
| `PetIds`          | The cats to assign. An array, so a shared visit is possible.          |
| `GonePotty`       | Whether the cat used the box. The app calls the other case Lingering. |
| `Manual`          | Marks a manual assignment.                                            |

The outer `Type` selects the edit operation. It is separate from the event classification.
Android defines these operations in `RequestAnnotateEventType`.

| Outer `Type` | Android name       | Fields inside the encoded `Result` |
| ------------ | ------------------ | ---------------------------------- |
| `1`          | `MultiPet`         | `PetIds`                           |
| `2`          | `ToiletError`      | `PetIds`, `GonePotty`, `Manual`    |
| `3`          | `ToiletFecesError` | `AbnormalType`, `Type`             |

For operation `3`, `AbnormalType` is a list and the inner `Type` is the event classification.
These schemas come from Android models and their repository methods.
Operations `1` and `3` remain untested against the service.

The response body is `{"Code":0,"Msg":"success","Data":{}}`.

A captured operation `2` reassigns a poop visit from one cat to another.
The next event list returns the new assignment.
Changing pee, poop, or lingering classifications remains untested.
The tested reassignment does not establish how `GonePotty` affects an existing pee classification.

### Read the calendar

`POST /api/v1/pet/toilet/data/calendar`

This request reads daily summaries for one cat.
The following example requests the first day of January.
Its end date is the following day.

```json
{
  "PetId": "<pet id>",
  "StartDate": "2000-01-01 00:00:00",
  "EndDate": "2000-01-02 00:00:00",
  "IncludeLocal": true,
  "FollowRegisterTimezone": true
}
```

| Field                    | Type    | Meaning                                                            |
| ------------------------ | ------- | ------------------------------------------------------------------ |
| `PetId`                  | String  | Cat identifier from `/api/v1/user/pet/sync`.                       |
| `StartDate`              | String  | First requested calendar date, formatted as `YYYY-MM-DD HH:MM:SS`. |
| `EndDate`                | String  | Calendar date after the requested period, in the same format.      |
| `IncludeLocal`           | Boolean | Requests inclusion of local records. Tested with `true`.           |
| `FollowRegisterTimezone` | Boolean | Requests the registered timezone. Tested with `true`.              |

The direct tests return HTTP 200 and `Code: 0`.
`Data.PetId` matches the requested cat.
`Data.DataCalendar` contains daily entries, or `null` when the tested interval has no entries.
Treat a null value as an empty list.

This example shows the response data with sample values.

```json
{
  "PetId": "<pet id>",
  "DataCalendar": [
    {
      "Date": "2000-01-01",
      "Normal": 2,
      "Abnormal": 1,
      "NormalDuration": 120000,
      "AbnormalDuration": 60000,
      "AbnormalSummary": {
        "AboveBaseline": false,
        "Event": true,
        "Frequency": false,
        "IrregularDuration": false
      }
    }
  ]
}
```

| Daily field                         | Type    | Meaning                                                       |
| ----------------------------------- | ------- | ------------------------------------------------------------- |
| `Date`                              | String  | Calendar date formatted as `YYYY-MM-DD`.                      |
| `Normal`                            | Integer | Count of normal litter box use events.                        |
| `Abnormal`                          | Integer | Count of abnormal litter box use events.                      |
| `NormalDuration`                    | Integer | Total duration of normal events, in milliseconds.             |
| `AbnormalDuration`                  | Integer | Total duration of abnormal events, in milliseconds.           |
| `AbnormalSummary.AboveBaseline`     | Boolean | Above-baseline flag. The exact condition remains unknown.     |
| `AbnormalSummary.Event`             | Boolean | Event abnormality flag. The exact condition remains unknown.  |
| `AbnormalSummary.Frequency`         | Boolean | Frequency flag. The exact condition remains unknown.          |
| `AbnormalSummary.IrregularDuration` | Boolean | Irregular-duration flag. The exact condition remains unknown. |

`Normal` and `Abnormal` classify normality. They do not separate pee from poop.
Use event records to obtain waste type, cat assignment, and media references.
The calendar contains no event identifiers, recording URLs, or snapshot references.

#### Date boundaries and empty results

The tested interval includes the start date and excludes the end date.
A same-date request from `00:00:00` to `23:59:59` returns `DataCalendar: null`.
Moving the end date to the following midnight returns the selected day.
Changing that end time to `23:59:59` leaves the result unchanged in the comparison test.
Use midnight boundaries with the date after the last requested day as `EndDate`.

The wider response contains sorted, unique dates with gaps.
It does not provide a row for every requested date.
The response does not explain whether each missing date means no events or unavailable history.
The tested response contains no paging fields.
Maximum date range, retention limits, and alternate timezone behavior remain untested.

#### Comparison with event records

Two daily comparisons use `/api/v1/pet/toilet/event` with the same timezone and local-record flags.
Both event responses contain `More: false`.
The comparison selects the requested cat and event types `2` and `3`.
`Normal + Abnormal` matches the selected event count in both tests.
`NormalDuration + AbnormalDuration` matches the sum of event durations in milliseconds.

One tested day contains abnormal events.
Its `Abnormal` count and `AbnormalDuration` match events with a positive `FecesAbnormal` entry.
This sample does not establish every server rule for classifying abnormal events.

## Media

Images and video live in S3. A bucket key identifies an object within a bucket.
The `Url` fields in the captured records contain bucket keys.
`ToiletVideo.Cover.Url` identifies the thumbnail, and `ToiletVideo.RawInfo.Url` identifies the MP4 recording.
When `FecesImage` exists, `FecesImage.Url` identifies the stool image.

`ToiletVideo.RawInfo` also contains `CreateTime`, `Duration`, `Height`, `Width`, `Md5`, and `Size`.
The tested video size matches `Size` in bytes.
Both event `Duration` and video `Duration` match the decoded clip length when interpreted as milliseconds.

### Access media

`POST /api/v1/config/aws/auth` with `{}` returns temporary credentials.
Use the main API bearer token for this request.
The direct test returns HTTP 200 and `Code: 0`.

`Data` contains `ExpireTime`, `IdentityId`, `IdentityPoolId`, `Token`, `S3`, and `IotCore`.
`Data.S3` contains the fields needed for media access.

| Field             | Purpose                                             |
| ----------------- | --------------------------------------------------- |
| `AccessKeyId`     | Temporary access key identifier.                    |
| `SecretAccessKey` | Secret used to sign S3 requests.                    |
| `SessionToken`    | Temporary session credential required with the key. |
| `ExpireTime`      | Credential expiration.                              |
| `S3Bucket`        | Bucket used to retrieve media.                      |
| `UploadPath`      | Upload path supplied by the service.                |

Android `AWSManager` uses these three credentials with an S3 client in `us-east-1`.
Its `getS3Url` method signs a GET URL for `S3Bucket` and the requested object key.
A signed URL grants temporary access to one object.

The direct test uses AWS Signature Version 4 with a five-minute URL lifetime.
It retrieves a complete MP4 recording and its JPEG thumbnail through HTTP range requests.
Both requests return HTTP 206. The video byte count matches the API metadata.
The video decoder reads a frame successfully without additional decryption.

A separate test downloads the stool snapshot referenced by `FecesImage.Url`.
The request returns HTTP 200 and a JPEG image.
Its byte count, width, and height match the event metadata.
The image decoder reads it successfully. The tested snapshot contains a full camera frame.

The observed credential lifetime is about 10 hours.
A signed URL expires when its temporary credentials expire, even if its requested lifetime is longer.
See the [S3 signed URL documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html).
Refresh expired credentials before generating a playback URL.
Keep credentials and signed URLs out of logs and published metadata.

### Home Assistant playback

Home Assistant integrations can expose recordings through its media browser.
The tested MP4 contains H.265 video. A codec is a format for encoding video or audio.
This sample has no audio stream.

Playback depends on whether the browser or player supports the codec.
Home Assistant media source does not convert media to another encoding.
See the [Home Assistant media documentation](https://www.home-assistant.io/integrations/media_source/).

Initial playback targets macOS and iPhone clients with native H.265 support.
Video conversion is outside this scope.

The download and decoding tests establish access to cloud media.
Playback inside Home Assistant and access to recordings stored only on the device remain untested.

## Findings from the Android app

These findings come from static inspection of the Android app version 2.1.1.
They were not tested against the service unless this section says so.

### Session errors

- The app treats envelope `Code` -2 and -4 as an ended session. It then shows "Login failed" and opens the sign-in screen.
- The app does not read the HTTP status. The integration also treats HTTP 401 and 403 as an ended session.
- The app renews the token only when it opens, with the rule `now + 24 h > ExpireAt`. A failed renewal is only logged.
- A wrong email code at `/api/v1/user/email/register/login` returns `Code` 10004. The app shows other codes with `Msg`.

### Request headers of the Android app

| Header                | Format                                       |
| --------------------- | -------------------------------------------- |
| `User-Agent`          | `siipet-app/<version>`                       |
| `X-App-Version`       | `<version>`                                  |
| `X-Device-Model`      | `android-phone <model>`                      |
| `X-Device-OS`         | The Android release number, for example `15` |
| `X-Device-Language`   | `en` or `zh-TW`                              |
| `X-Device-Identifier` | A stable per-install identifier              |
| `X-Timezone`          | An IANA time zone                            |
| `X-Timestamp`         | Milliseconds since the Unix epoch            |
| `Authorization`       | `Bearer <token>` after sign-in               |

The integration sends the header set of the captured iOS app with an Android-style `x-device-model`. Live tests show that the API accepts this mix.

### Day list paging

- The request class for `/api/v1/pet/toilet/event` has `Date`, `IncludeLocal`, `IsMock`, and `FollowRegisterTimezone`. It has no cursor field.
- The app makes one request per day. It never reads `More` or `Track`.

### Memo edit

- `POST /api/v1/pet/toilet/event/edit` with `{"EventId", "Note"}`.
- The app limits the note to 200 characters. It allows the edit only when the visit `GroupId` equals the user `GroupId`.
- The request can also carry `FecesImage`. No screen in this app version sends it.

### Visit delete

- `POST /api/v1/device/toilet/event/delete` with `{"EventId"}` deletes a visit.
- `POST /api/v1/pet/toilet/event/feces/image/delete` with `{"EventId"}` deletes only the stool image.
- `POST /api/v1/device/replay/delete` is for behavior replays. The app does not call it.

### Annotate operations

- Operation 1 (`MultiPet`) sends `{"PetIds"}` from the multi-pet dialog.
- Operation 2 (`ToiletError`) sends `{"PetIds", "GonePotty", "Manual"}` from the "Edit Event" sheet.
  - `GonePotty` is the answer to "Did your cat use the litter box?".
  - `Manual` is true when you change the pets.
  - After success, the app sets the type to 2 for `GonePotty` true and to 1 for false. This operation cannot select pee.
- Operation 3 (`ToiletFecesError`) sends `{"AbnormalType": [shape, color], "Type"}` from the stool sheet.
  - Normal stool: `{"AbnormalType": [0, 0], "Type": 2}`.
  - Pee: `{"Type": 3}`.
- A change from lingering to pee takes two calls: operation 2 with `GonePotty` true, then operation 3 with `Type` 3.

### Abnormal codes

`/api/v1/config/system/config` returns `Data.Memory.AbnormalToilet`, a list of objects with `Shape`, `Color`, and `Event` lists.
Each item has `Type`, `Title`, and `Icon`. Code 0 means normal.

| Group | Codes                                |
| ----- | ------------------------------------ |
| Shape | 101 to 104, and 199 for other shapes |
| Color | 201 to 206, and 299 for other colors |
| Event | 301, "Potty Overtime"                |

The Android app also defines shape code 105 (sausage-shaped), which the
captured server config does not list.

- Index 0 of `FecesAbnormal` is the shape code. Index 1 is the color code.
- `EventAbnormal` holds an event code.

### Statistics endpoints

- `POST /api/v1/pet/toilet/data/trend` with `{"PetId", "Days": 7 or 30, "FollowRegisterTimezone": true}`.
- `POST /api/v1/pet/toilet/data/compare` with `{"PetId", "StartDate", "CompareType": 1 (week) or 2 (month), "FollowRegisterTimezone": true}`.
- Both return daily entries with `Date`, `Normal`, `Abnormal`, `NormalDuration`, `AbnormalDuration`, and `AbnormalSummary`.

## Live checks

These results come from tests against a real account.

- The server checks `x-device-model` on authenticated calls. With the same valid token and the same `x-device-identifier`, only the model changed:

  | `x-device-model`                 | Result    |
  | -------------------------------- | --------- |
  | `Home Assistant`                 | `Code` -2 |
  | `HomeAssistant`                  | `Code` -2 |
  | `Mac`                            | `Code` -2 |
  | `iPhone`                         | `Code` 0  |
  | `iPhone 16 Pro`                  | `Code` 0  |
  | `iPhone 16 Pro (Home Assistant)` | `Code` 0  |
  | `android-phone Home Assistant`   | `Code` 0  |

- The -2 response has `Msg` "token illegal, other device device has logged in". The message is misleading. The token is valid, and no other device caused the error.
- The `Accept`, `Accept-Language`, and `Accept-Encoding` headers do not change the result.
- The email-code sign-in returned `Code` 0 with the model `Home Assistant`. The error showed on the first authenticated call.
- An access token copied from the phone app works from another client that sends the phone's `x-device-identifier` and an accepted model.
- During these tests, the phone app stayed signed in after each email-code sign-in from another client.
- The email code request is rate limited per day: `Code` 10010, `Msg` "Too many request today. Please try again tomorrow."
- A wrong email code is `Code` 10004 (already handled).

## Open questions

- Whether the iPhone uses the Android renewal condition.
- How renewal behaves near or after the encoded token expiration, and how long
  the previous token remains valid after renewal.
- History paging with `More` and `Track`.
- Camera paging and continuation request fields.
- Camera connection timestamp semantics and subscription code meanings.
- Live video and device replay through the credentials in `AgoraAuth`.
- Calendar range limits, history retention, and behavior with alternate timezone flags.
- Complete rules for the calendar abnormality summary flags.
- Live examples of unknown, lingering, and pee events.
- Live edits of waste classification and abnormality metadata.
- Complete meanings of stool and event abnormality codes.
- Access to recordings stored only on the device.
- Playback through Home Assistant on the intended macOS and iPhone clients.
- Whether the server enforces the shared-user restriction, or whether the app hides
  the reassignment button on the client side only. This decides whether a second
  account can be used instead of the admin account.
- Which envelope codes the server returns for an expired or invalid token. The
  app treats -2 and -4 as an ended session.
- Whether the server checks `x-device-os`. `iOS 27.0` works with both model prefixes.
- Whether an account allows more than one active session. The earlier -2 results
  came from the model header, so they do not answer this.
- Whether a sign-in from Home Assistant ends the session of the phone app once
  Home Assistant uses its token.
