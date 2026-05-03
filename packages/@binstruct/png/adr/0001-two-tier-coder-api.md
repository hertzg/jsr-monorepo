# ADR 0001 — Two-tier coder API: `pngFile()` for the common case, `pngFileChunks(chunkCoder)` for custom chunk handling

**Status:** Accepted

## Context

Most consumers want to read a PNG file, get typed access to the
chunks they care about, and write it back. A one-call coder
(`pngFile()`) covers that. But some consumers don't:

- Tools that inspect or rewrite specific chunks without parsing
  others (e.g. strip metadata, replace IDAT, copy IHDR).
- Tools that need to refine custom or experimental chunk types
  the package doesn't know about.
- Tests that want to hand-craft chunks at the byte level.

A single fixed coder pessimizes those cases — the consumer either
re-parses chunks the package already parsed, or re-implements the
file-level structure.

## Decision

The package exposes the coder API in two tiers:

- **`pngFile()`** — the one-call shortcut. Returns a coder over
  the full PNG file with auto-refined chunks: known types
  (`IHDR`, `PLTE`, `tRNS`, `bKGD`, `IDAT`, `IEND`) become their
  refined variants; unknown types pass through as
  `PngChunkUnknown`.
- **`pngFileChunks(chunkCoder)`** — the builder primitive. Takes
  any `Coder<TChunk>` and produces a coder for the PNG file
  structure (8-byte signature + chunk array) using that chunk
  coder.

The package also exports each refiner individually
(`ihdrChunkRefiner`, `idatChunkRefiner`, …) and each refined type
(`IhdrChunk`, `IdatChunk`, …). Callers can compose their own
chunk pipeline — for example, only refine IHDR, leave the rest
as `PngChunkUnknown` — and feed it to `pngFileChunks`.

`pngFile()` is implemented as `pngFileChunks(pngChunkRefined())`.
The shortcut has no privileged access; any consumer could
recreate it.

## Consequences

- **Common case stays one call.** `decode(pngFile(), bytes)` works.
- **Power users compose.** Custom chunk pipelines plug into
  `pngFileChunks` without rewriting the file-level structure.
- **Refiners are first-class exports.** Adding a new refiner is
  a public-API addition; renaming or removing one is a breaking
  change.
- **The shortcut tracks the refiner set.** Adding a known chunk
  type means updating both the per-chunk refiner module (ADR
  0002) and the `pngChunkRefined()` switch.
- **Tree-shaking is a non-goal at this layer.** `pngFile()`
  pulls in every chunk refiner; consumers who care about bundle
  size build their own narrower chunk coder.

## References

- `mod.ts` — `pngFile`, `pngFileChunks`, `pngChunkUnknown`,
  `pngChunkRefined`, refiner re-exports
- ADR 0002 — Per-chunk refiner module pattern
- ADR 0003 — `refineSwitch` dispatches on the chunk's `type`
