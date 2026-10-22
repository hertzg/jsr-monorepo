# @hertzg/hikvision-api

Hikvision ISAPI, the HTTP API of its NVRs and cameras. One device per
client, Basic auth, every call its own request. Runs on Deno and Bun.

## Glossary

- **ISAPI**: Hikvision's HTTP API. Paths under `/ISAPI/`, XML bodies.
- **Device**: an NVR or a camera. `deviceInfo().deviceType` tells which.
- **Channel**: a video input numbered from 1. On an NVR an IP camera is an
  *input proxy channel*; the NVR itself is channel 0 in alerts. Smart and
  motion paths take the channel, never a rule id.
- **Channel status**: `/InputProxy/channels/status`: `online` plus the
  offline reason (`chanDetectResult`) and the camera's own URL.
- **Alert**: one `<EventNotificationAlert>` from the alert stream, plus `at`.
- **Alert stream**: `GET /ISAPI/Event/notification/alertStream`, a
  `multipart/mixed` response that never ends.
- **Part**: one block of the multipart body: headers and body bytes.
- **Close delimiter**: `--boundary--`. Cameras write one after each event
  part and keep streaming; the parser skips it.
- **Virtual host port**: `6500n` on an NVR is camera n's own ISAPI, through
  the NVR: `http://<nvr>:65002` is camera 2.
- **Event type**: `<eventType>`: `VMD` (motion), `videoloss`,
  `fielddetection`, `linedetection`, `regionEntrance`, `IO`, …
  `SMART_RULE_TYPES` maps a smart path segment to its event type.
- **Event state**: `active` or `inactive`. VMD never posts `inactive`; some
  smart events do.
- **Heartbeat**: `videoloss inactive` every 10 s. An NVR holds it back while
  alerts flow; a camera keeps it up.
- **`at`**: when an alert arrived, ISO 8601. The clock to trust.
- **`dateTime`**: the device's clock as text. NVRs write no zone.
- **Device time**: `/ISAPI/System/time`: mode, local time, and the POSIX
  `timeZone` whose sign is inverted (`CST-4:00:00` is UTC+4).
- **Grid**: the motion detection cells, `rows` x `columns`, from the
  `gridMap` hex string (top row first, column 0 is the high bit).
- **Region**: a polygon of a smart rule or of motion detection. **Line**: a
  segment of a line detection rule. Both in the 1000 x 1000 screen space.
- **Smart rules**: one `/ISAPI/Smart/<type>/<channel>` document; every
  region type shares the shape `<Type>/<TypeRegionList>/<TypeRegion>`.
- **Target rect**: the box a smart alert draws around what it detected.
- **Capabilities**: a `.../capabilities` document listing what a channel
  supports, with `opt`/`min`/`max` attributes instead of values.
- **ResponseStatus**: the XML a device answers when a request fails, on
  4xx or on 200. `statusCode` 0 or 1 is OK; anything else is `IsapiError`.

## Rules

- The client never reconnects, keeps no timers, and never infers that
  motion ended (ADR 0002). Consumers measure silence from `at`.
- Errors come from the body as much as from the status: parse the
  `<ResponseStatus>` on every status, keep its reason.
- Read by local element name; never depend on `xmlns`. Every field a
  device may omit is optional; unknown elements are ignored.
- Fixtures use documentation addresses (`192.0.2.0/24`), locally
  administered MACs (`02:…`) and generic channel names, never a real site.
