# @hertzg/hikvision-api

Hikvision ISAPI, the HTTP API of its NVRs and cameras. One device per
client, Basic auth, every call its own request. Runs on Deno and Bun.

## Glossary

- **ISAPI**: Hikvision's HTTP API. Paths under `/ISAPI/`, XML bodies.
- **Device**: an NVR or a camera. `deviceInfo().deviceType` tells which.
- **Channel**: a video input numbered from 1. On an NVR an IP camera is an
  *input proxy channel*; the NVR itself is channel 0 in alerts. Smart and
  motion paths take the channel, never a rule id.
- **Channel status**: `online` plus the offline reason (`chanDetectResult`)
  and the camera's own URL, per IP channel.
- **Virtual host port**: `6500n` on an NVR is camera n's own ISAPI, through
  the NVR: `http://<nvr>:65002` is camera 2.
- **Alert stream**: `GET /ISAPI/Event/notification/alertStream`, a
  `multipart/mixed` response that never ends. Each **part** is one
  **alert**, an `<EventNotificationAlert>`, plus `at`.
- **Close delimiter**: `--boundary--`. Cameras write one after each event
  part and keep streaming; the parser skips it.
- **Event type / state**: `<eventType>` (`VMD`, `videoloss`,
  `fielddetection`, `regionEntrance`, …) and `active` or `inactive`. VMD
  never posts `inactive`; some smart events do.
- **Heartbeat**: `videoloss inactive` every 10 s. An NVR holds it back while
  alerts flow; a camera keeps it up.
- **`at`**: when an alert arrived, ISO 8601. The clock to trust.
  **`dateTime`** is the device's clock as text; NVRs write no zone.
- **Device time**: mode, local time and the POSIX `timeZone`, whose sign is
  inverted (`CST-4:00:00` is UTC+4).
- **Grid**: the motion cells, `rows` x `columns`, from the `gridMap` hex
  string (top row first, column 0 is the high bit).
- **Region / line**: a polygon or segment of a smart rule, or a motion
  region, in the 1000 x 1000 screen space. A smart alert adds a **target
  rect** around what it detected.
- **Smart rules**: one `/ISAPI/Smart/<type>/<channel>` document; every
  region type shares the shape `<Type>/<TypeRegionList>/<TypeRegion>`.
- **Capabilities**: a `.../capabilities` document with `opt`/`min`/`max`
  attributes instead of values.
- **ResponseStatus**: the failure document, on 4xx or 200. `statusCode` 0
  or 1 is OK; anything else is `IsapiError`.
- **Document codec**: a `document({...})` of field codecs in `isapi/`,
  keyed by element name; every reader is one description plus a small
  mapping to its public type (ADR 0001).

## Rules

- `mod.ts` is the only entry point; everything else is internal (ADR 0003).
- The client never reconnects, keeps no timers, and never infers that
  motion ended (ADR 0002). Consumers measure silence from `at`.
- Parse the `<ResponseStatus>` on every status and keep its reason.
- Read by local element name; every element a device may omit is
  `optional()`; unknown elements are ignored.
- Fixtures use `192.0.2.0/24`, `02:…` MACs and generic names, never a
  real site.
