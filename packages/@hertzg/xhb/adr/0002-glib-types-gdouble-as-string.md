# ADR 0002 — GLib type aliases mirror HomeBank's C source; `gDouble` is `string`

**Status:** Accepted

## Context

HomeBank is written in C using GLib types: `gshort`, `gushort`,
`gint`, `guint32`, `gchar *`, `gdouble`, `gboolean`. Field types in
the XHB format inherit those names and ranges. Mapping them to
TypeScript could either flatten everything into `number`/`string`/
`boolean` or preserve the GLib vocabulary as type aliases.

The flat approach reads more "TS-native" but loses information about
the wire format — when porting fixes from HomeBank's source, a
maintainer no longer sees that `flags` is a `gushort` and may
silently pick a wider type that breaks round-trip serialization.

`gDouble` brings a sharper concern. HomeBank stores monetary amounts
as C `double` and serializes them with full precision —
`"76.219999999999999"` is a real value the library encounters.
Parsing this through `Number()` produces `76.22` and re-serializing
produces `"76.22"`, breaking round-trip (ADR 0001) and quietly
losing the original precision the user typed in HomeBank.

## Decision

Each GLib C type has a TS alias in `_g_types.ts`:

```ts
export type gShort   = number;   // signed 16-bit
export type gUShort  = number;   // unsigned 16-bit
export type gInt     = number;   // signed 32-bit
export type gUInt32  = number;   // unsigned 32-bit
export type gCharP   = string;   // C `gchar *`
export type gBoolean = number;   // 0 or 1
export type gDouble  = string;   // see below
```

**`gDouble` is `string`** — not `number`. Amounts and other
double-precision values are kept in their original textual form
through the entire parse/serialize cycle. No `parseFloat`, no
`toString()`. The parser stores the raw attribute string; the
serializer writes it back unchanged.

Entity interfaces use these aliases (`amount: gDouble`,
`flags: gUShort`) rather than `number`/`string` directly.

## Consequences

- **Round-trip precision is preserved** for every floating-point
  value, regardless of how many digits HomeBank wrote.
- **Arithmetic on `gDouble` values is not free.** Callers who need
  to compute on amounts must convert explicitly (and accept the
  precision loss for that calculation). The library does not do
  this on their behalf.
- **Type aliases document provenance.** `flags: gUShort` tells a
  reader the field is a 16-bit unsigned in HomeBank's source —
  helpful when chasing format changes upstream.
- **Aliases are exported** so consumers building tooling on top
  can use the same vocabulary.
- **No runtime branding.** `gUShort` is just `number` at runtime;
  the alias is purely a documentation device for TypeScript.

## References

- `_g_types.ts` — type aliases
- `_parse.ts` — `parseGDouble` (returns the raw string),
  `parseGCharP`, `parseGInt`, `parseGUInt32`
- ADR 0001 — Round-trip byte fidelity
