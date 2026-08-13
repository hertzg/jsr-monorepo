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

### Amendment — `pngFileChunks` defaults its chunk coder

`pngFileChunks` now defaults `chunkCoder` to `pngChunkRefined()`
and defaults `TChunk` to the refined chunk union, so
`pngFileChunks()` is both type-equal and value-equal to
`pngFile()`. The two tiers are unchanged: `pngFileChunks` still
takes a chunk coder, it merely supplies the obvious one when the
caller omits it. The rule is **default a factory when a correct
default exists; keep the argument required when the obvious
default would be silently wrong.** `pngChunkRefined()` is exactly
what `pngFile()` passes, so there is no wrong default to pick.

`pngFile()` stays. It is the documented entry point, it is what
`pngsuite.test.ts` uses, and removing it would be a breaking
change for no gain. The cost is a synonym: `pngFileChunks()` and
`pngFile()` are the same call, and tooling that enumerates
zero-argument coders (the CLI menu) now lists both.

The type-parameter default is derived from `pngChunkRefined`'s
return type rather than restating the union, so adding a known
chunk type still means updating two places, not three.

`Coder` is invariant, so the default value needs
`as unknown as Coder<TChunk>`; that cast makes
`pngFileChunks<Other>()` with no value argument unsound. Overloads
would close that hole and keep `Function.length` at 0, but
`deno doc --json` emits one declaration per overload and the CLI's
`discover.ts` appends a coder per declaration, so an overloaded
`pngFileChunks` is listed three times — twice as callable and once
as `needs 1 argument`. The unsound call is a type-level hole that
requires an explicit type argument to reach; the duplicate listing
is user-visible in the tool this decision exists to serve. The
cast is the lesser cost.

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
