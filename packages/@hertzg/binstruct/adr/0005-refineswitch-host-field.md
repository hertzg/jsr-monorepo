# ADR 0005 — `refineSwitch` dispatches on a host field, not a kind wrapper around the payload

**Status:** Accepted

## Context

Tagged unions in binary formats follow a common pattern: a discriminator
field — chunk type, packet kind, message tag — determines how the rest of
the payload should be interpreted. PNG chunks have a 4-byte type field;
Ethernet frames have an etherType; ICMP packets have a type+code pair.

The naive shape would wrap the refined payload:

```ts ignore
// NOT how this library does it
type PngChunk =
  | { kind: "IHDR"; payload: { width, height } }
  | { kind: "IDAT"; payload: Uint8Array };
```

But the wire format already has the discriminator inside the host record.
Wrapping forces:

- An extra allocation (the wrapper object) on every encode/decode.
- Two ways to spell the same idea (`chunk.kind` vs `chunk.type`).
- The refined type to look unlike the unrefined one — confusing for
  layered formats where you sometimes want to operate on either.

## Decision

`refineSwitch(baseCoder, refiners, selector)` produces refined values
that **preserve the discriminator field on the host**:

```ts ignore
const pngChunkCoder = refineSwitch(
  pngChunkUnknown,                                 // base: { length, type: bytes(4), data, crc }
  { IHDR: ihdrRefiner(), IDAT: idatRefiner() },    // arms keyed by selector keys
  {
    refine:   (chunk, ctx) => decode(string(4), chunk.type, ctx),
    unrefine: (chunk, _ctx) => chunk.type,
  },
);
```

A refined IHDR chunk is `{ length, type: "IHDR", data: { width, height }, crc }`.
The `type` field stays at the top level — refined from raw bytes to a
string literal, but in the same slot. No `{ kind, payload }` wrapper.

**Discriminator stability contract:** `selector.refine(unrefined)` and
`selector.unrefine(refined)` must return the same key for corresponding
values. Returning `null` is fail-fast — `refineSwitch` throws with the
list of available keys.

## Consequences

- **No payload allocation.** Refined values are restructurings of the
  host, not wrappers around it.
- **TypeScript discriminated unions stay clean.** The discriminator field
  lifts to a string-literal type, and TS narrows accordingly.
- **The contract is mostly unenforced at compile time.** Returning a
  different key from `refine` vs `unrefine` produces wrong wire output
  without a TS error. Fail-fast on `null` is the only runtime check.
- **Adding a new arm = new refiner key + new selector branch.** No base
  coder changes; the host shape stays the same.
- **Unknown discriminator values need an explicit fallback arm**, not
  silent passthrough. Returning `null` for unknown types throws —
  callers who want a passthrough write an `unknown` refiner that returns
  the host as-is.

## References

- `refine/switch.ts` — `refineSwitch`, `RefinedUnion`, selector contract
- ADR 0004 — Refiner is a factory
- User memory: `feedback_refineswitch_dispatch_on_host_field.md`
