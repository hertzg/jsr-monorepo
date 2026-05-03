# ADR 0002 — Per-chunk refiner module pattern

**Status:** Accepted

## Context

PNG defines a small number of standard chunks (IHDR, PLTE, IDAT,
IEND, plus optional ancillary chunks like tRNS, bKGD, gAMA, …).
Each has its own data layout — IHDR is a 13-byte struct of fixed
fields, PLTE is an array of RGB triples, tRNS is one of three
shapes depending on the source color type, IDAT is zlib-compressed
image data.

Putting all chunk handling in a single file would interleave the
parsing of unrelated formats and force every reader to scroll past
chunks they aren't interested in. Each chunk's refinement is
self-contained — its inputs are the raw `PngChunkUnknown`, its
output is a typed structure, its dependencies are binstruct
primitives.

## Decision

Each known chunk type lives in its own module under `chunks/`:

```
chunks/ihdr.ts   — IHDR (image header)
chunks/plte.ts   — PLTE (palette)
chunks/trns.ts   — tRNS (transparency)
chunks/bkgd.ts   — bKGD (background colour)
chunks/idat.ts   — IDAT (compressed image data)
chunks/iend.ts   — IEND (image end)
```

Every file follows the same shape:

- An exported refined `interface <Chunk>Chunk` extending
  `Omit<PngChunkUnknown, "type" | "data">` with a literal `type`
  and a parsed `data` field.
- An exported factory `<chunk>ChunkRefiner(): Refiner<PngChunkUnknown,
  <Chunk>Chunk, []>` that builds the refiner using binstruct
  primitives (`struct`, `u32be`, `string`, etc.).
- A sibling `<chunk>.test.ts` covering encode/decode round-trips.

Adding support for a new PNG chunk type is exactly:

1. Create `chunks/<name>.ts` and `chunks/<name>.test.ts`.
2. Export the refined type and refiner factory from `mod.ts`.
3. Add the type code as a switch arm in `pngChunkRefined()`.

## Consequences

- **One file, one chunk.** Easy to find, easy to test, easy to
  understand in isolation.
- **Adding a chunk is mechanical.** No file gets bigger as the
  package grows.
- **Module structure mirrors the PNG spec.** A reader who knows
  PNG can navigate the source.
- **The refiner shape is the contract.** A new chunk that fits
  the pattern composes with the existing infrastructure; one
  that doesn't (e.g. needs cross-chunk state) is an open
  design problem.
- **Per-chunk tests are independent.** A regression in IDAT
  doesn't block work on tRNS.

## References

- `chunks/` — one file per known chunk type
- `mod.ts` — `pngChunkRefined()` switch over chunk types
- ADR 0001 — Two-tier coder API
- ADR 0003 — `refineSwitch` dispatches on the chunk's `type`
