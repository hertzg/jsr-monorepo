# ADR 0001 - @std/xml parses every ISAPI document, alerts included

Every ISAPI body goes through `@std/xml`'s `parse`, and the helpers in
`xml.ts` read children by local name. No regex over tags anywhere.

An alert is flat enough for a regex, but it stops being flat the moment a
smart event fires:

```xml
<EventNotificationAlert>
  <eventType>fielddetection</eventType>
  <DetectionRegionList>
    <DetectionRegionEntry>
      <RegionCoordinatesList>
        <RegionCoordinates><positionX>654</positionX>…
```

Config documents nest the same way, and firmwares differ in whether they
declare `xmlns`, so matching on local names is what makes one reader work
for an NVR and a camera. The same dependency already serves
`@hertzg/reolink-api` and `@hertzg/xhb`.

Ruled out:

- A regex per tag for alerts only. Two parsers for one wire format, and
  the regex breaks on the first nested payload.
- `@std/xml`'s streaming callbacks. Parts arrive whole, so a DOM per part
  is simpler and the parts are small.
