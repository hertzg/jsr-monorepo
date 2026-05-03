# ADR 0003 — `refineSwitch` dispatches on the chunk's `type` field with `UNKNOWN` passthrough; refined shape preserves the host envelope

**Status:** Accepted

## Context

A PNG file is a stream of chunks; each chunk's interpretation
depends on its 4-byte `type` field. The package has to decide
*which* refiner to apply to *which* chunk, and what to do with
chunks whose type is not in the known set.

`@hertzg/binstruct` ADR 0005 dictates that `refineSwitch`
dispatches on a host field, not on a kind wrapper around the
payload. PNG fits the rule perfectly — the `type` field is on
the host `PngChunkUnknown`, not on a wrapper that would force
the caller to allocate a new shape.

Two related shape questions follow:

- What does a refined chunk *look like*? Does it fully replace
  `PngChunkUnknown`, or does it reuse parts of it?
- What happens to chunks the package doesn't recognize? Are they
  errors, or do they pass through unchanged?

## Decision

**Dispatch.** `pngChunkRefined()` builds a `refineSwitch` over
`pngChunkUnknown()`. The selector decodes the 4-byte `type` from
`chunk.type` (a `Uint8Array` on the unrefined side) using a
`string(4)` coder and returns one of the known type strings
(`"IHDR"`, `"PLTE"`, `"tRNS"`, `"bKGD"`, `"IDAT"`, `"IEND"`),
or `"UNKNOWN"` when the type is unrecognized.

**Passthrough.** The `"UNKNOWN"` arm uses an identity refiner —
input bytes pass through as `PngChunkUnknown`, encoding writes
them back unchanged. Unknown chunks are *preserved*, not
dropped or errored.

**Refined shape.** Each refined chunk type follows the same
recipe:

```ts
interface IhdrChunk extends Omit<PngChunkUnknown, "type" | "data"> {
  type: "IHDR";
  data: { width: number; height: number; /* … */ };
}
```

`length` and `crc` stay as wire-format numbers from the host —
they remain meaningful even after refinement. Only `type`
(now a string literal) and `data` (now a parsed structure)
change shape.

## Consequences

- **The refined coder is total.** Every well-formed chunk gets
  *some* refined or passthrough representation; nothing is
  silently dropped.
- **Round-tripping unknown chunks works.** Read a PNG, modify a
  known chunk, write it back — the unknown chunks survive
  byte-for-byte.
- **`length` and `crc` remain caller's concern.** They are
  visible on every refined chunk; the caller can trust or
  recompute them per ADR 0005.
- **Adding a new known type changes the discriminator return
  type.** The selector union widens; existing callers handling
  `"UNKNOWN"` keep working without changes.
- **The selector is symmetric.** `refine` decodes `chunk.type`
  bytes; `unrefine` reads `chunk.type` as a string. Both
  produce the same key for the same logical chunk, satisfying
  the binstruct discriminator-stability contract.

## References

- `mod.ts` — `pngChunkRefined()` selector and switch
- `chunks/*.ts` — refined chunk shapes
- `@hertzg/binstruct` ADR 0005 — `refineSwitch` host-field
  dispatch
- ADR 0005 — CRC validation is the caller's responsibility
