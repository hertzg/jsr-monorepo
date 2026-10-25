# ADR 0001 - Every ISAPI document is a codec description, read by one engine

Each reader is a `document({...})` of fields keyed by element name, from
`isapi/document/`, one field kind per file: `text()`, `int()`, `bool()`,
`tokens()`, `points()`, `attribute()`, `attributes()`, `obj()`, `list()`,
`repeated()`, `optional()`. A field reads the element it is handed and never
looks one up; `decodeFields` finds the children by name and decides what a
missing one means: a required field throws naming both elements, an
`optional()` one is left out, a `list()` or `repeated()` one reads `[]`.

```ts
const time = document({ timeMode: text(), localTime: text(), platformType: optional(text()) });
// <Time><timeMode>NTP</timeMode><localTime>2026-10-22T11:33:52+04:00</localTime></Time>
// -> { timeMode: "NTP", localTime: "2026-10-22T11:33:52+04:00" }
```

A description lists the elements a reader needs, and firmwares differ in
which they send. `@std/xml` parses and offers no navigation, so
`children()` is the one lookup, internal to the folder.

Ruled out:

- A field that finds its own element by name. Lists then had to forge a parent
  around each item, and the lookups leaked out as exports.
- `@hertzg/reolink-api`'s codec. Baichuan specifics, and two copies is under the rule of three.
