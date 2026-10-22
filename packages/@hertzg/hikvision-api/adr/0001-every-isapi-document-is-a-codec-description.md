# ADR 0001 - Every ISAPI document is a codec description, read by one engine

Each reader is a `document({...})` of field codecs (`text()`, `int()`,
`bool()`, `tokens()`, `points()`, `attribute()`, `obj()`, `list()`,
`repeated()`, `optional()`) from `isapi/document.ts`. `@std/xml` parses, the
description reads by local element name. A missing required element throws
naming both elements. A missing `optional()` one is left out.

```ts
const time = document({ timeMode: text(), localTime: text(), platformType: optional(text()) });
// <Time><timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime></Time>
// -> { timeMode: "NTP", localTime: "2026-10-22T11:33:52+04:00" }
```

A dozen hand-written readers each walked the tree their own way: a helper
grab bag, `if (x !== undefined)` chains, private `number()` copies. A
description lists the elements a reader needs, and firmwares differ in which
they send.

Ruled out:

- A regex per tag for alerts only. It breaks on the first nested payload.
- `@std/xml` streaming callbacks. Parts arrive whole, so a DOM per part is simpler.
- `@hertzg/reolink-api`'s codec. Baichuan specifics, and two copies is under the rule of three.
