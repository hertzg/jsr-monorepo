# @hertzg/hikvision-api

Hikvision ISAPI, the HTTP API of its NVRs and cameras. One device per
client, Basic auth, every call its own request.

## Glossary

- **ISAPI**: Hikvision's HTTP API. Paths under `/ISAPI/`, XML bodies.
- **Device**: an NVR or a camera. `deviceInfo().deviceType` tells which.
- **Channel**: a video input numbered from 1. On an NVR an IP camera is an
  *input proxy channel*; the NVR itself is channel 0 in alerts.
- **Alert**: one `<EventNotificationAlert>` from the alert stream, plus `at`.
- **Alert stream**: `GET /ISAPI/Event/notification/alertStream`, a
  `multipart/mixed` response that never ends.
- **Part**: one block of the multipart body: headers and body bytes.
- **Event type**: `<eventType>`: `VMD` (motion), `videoloss`,
  `fielddetection`, `linedetection`, `tamperdetection`, `IO`, …
- **Event state**: `active` or `inactive`.
- **Heartbeat**: `videoloss inactive` every 10 s while nothing else posts.
- **`at`**: when an alert arrived, ISO 8601. The clock to trust.
- **`dateTime`**: the device's clock as text. NVRs write no zone.
- **Grid**: the motion detection cells, `rows` x `columns`, from `gridMap`.
- **Region**: a polygon of a field detection rule. **Line**: a segment of a
  line detection rule. Both in the normalized 1000 x 1000 screen space.
- **ResponseStatus**: the XML a device answers when a request fails, with
  HTTP 200. `statusCode 1` is OK; anything else throws `IsapiError`.

## Rules

- The client never reconnects, keeps no timers, and never infers that
  motion ended (ADR 0002). Consumers measure silence from `at`.
- Errors come from the body as much as from the status: a 200 with a
  failing `<ResponseStatus>` is a failure.
- Read by local element name; never depend on `xmlns`.
- Fixtures use documentation addresses (`192.0.2.0/24`), locally
  administered MACs (`02:…`) and generic channel names, never a real site.
