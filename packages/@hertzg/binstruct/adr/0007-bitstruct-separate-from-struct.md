# ADR 0007 — `bitStruct` is separate from `struct`

**Status:** Accepted

## Context

Some binary formats pack multiple fields into a single byte (or pair of
bytes): protocol headers, flag bitmaps, pixel formats, IPv4 version+IHL,
TCP data-offset+flags. `struct` operates at byte granularity — every
field starts on a byte boundary.

Two ways to support sub-byte fields:

1. **Bit cursors inside `struct`** — every `struct` encode/decode would
   need to track a bit offset, even for byte-aligned fields. This taxes
   the common case to support an uncommon one.
2. **A separate coder for bit-packed structures** — pays the bit-cursor
   cost only when you opt in, and slots back into `struct` as a normal
   field when needed.

We picked #2.

## Decision

Bit-packed structures use a **separate coder**, `bitStruct`, with its
own machinery (`BitDataView` for sub-byte cursoring, MSB-first bit
ordering).

```ts ignore
const flags = bitStruct({
  ready: 1,         // 1 bit
  error: 1,         // 1 bit
  mode: 2,          // 2 bits
  _reserved: 4,     // 4 bits of padding to reach 8
});                 // total: 8 bits = 1 byte
```

**Constraints:**

- Each field is **1–32 bits** (fits in a JS `number` per ADR 0008).
- **Total bit count must be a multiple of 8** (the coder produces whole
  bytes — sub-byte trailing data needs explicit padding).
- All fields decode to `number`, regardless of their bit count.
- MSB-first ordering: bit 7 is written/read first.

**Composition:** a `bitStruct` coder is a `Coder<{...}>` like any other.
It slots into a `struct` field when you need a packed header inside a
larger byte-aligned record:

```ts ignore
const packet = struct({
  flags: flags,           // bitStruct here
  length: u16be(),        // back to byte-aligned
  payload: bytes(ref(length)),
});
```

## Consequences

- **`struct` stays simple** — no bit cursors leaking into byte-aligned
  code paths. The common case pays nothing for the rare one.
- **Values larger than 32 bits don't belong in `bitStruct`.** Use
  `struct` with the appropriate numeric coder (`u64`, `s64`, etc.) or
  split the value across multiple `bitStruct` fields. The 32-bit cap
  exists because `bitStruct` decodes every field as `number` —
  bigint-valued bit fields would change the API.
- **Refs work on the whole `bitStruct` result, not individual fields.**
  `ref(bitStructCoder)` references the decoded object; you can't
  `ref(bitStructCoder.fields.flag)` (no such API).
- **Bit-packed structs that aren't byte-multiples don't fit.** Add a
  `_reserved` padding field to round up. This is a feature — it forces
  the coder boundary to align with the wire format.

## References

- `bits/bit-struct.ts` — `bitStruct`, `BitSchema`
- `bits/view.ts` — `BitDataView` MSB-first bit cursor
- ADR 0008 — 64-bit numerics return bigint
