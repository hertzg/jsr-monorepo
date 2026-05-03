# ADR 0004 — zlib decompression via nested refiners; round-trip is lossy on compression level

**Status:** Accepted

## Context

PNG's `IDAT` chunk carries zlib-compressed image data: a 2-byte
zlib header, a deflate-compressed payload, and a 4-byte Adler-32
checksum. A consumer who wants the *image* wants the
decompressed bytes; a consumer who wants the *file structure*
also wants the header fields (`compressionMethod`,
`compressionInfo`, `fcheck`, `fdict`, `flevel`).

There is a known asymmetry. zlib's `FLEVEL` field has 4 possible
values (0–3), but levels 0 ("store") and 1 ("fastest") both
compress at level 0 internally — the original encoder's intent
("don't compress" vs "compress as fast as possible with weakest
parameters") is not recoverable from the compressed bytes alone.
Re-compressing decompressed data picks one or the other and may
not reproduce the original deflate stream byte-for-byte.

## Decision

zlib handling is layered as two stacked `refine()` calls on top
of binstruct primitives:

- **`zlibCompressedCoder()`** — a refined `struct`:
  ```
  {
    header: zlibHeaderCoder(),
    compressedWithChecksum: bytes(),
  }
  ```
  Refined into `{ header, compressed, checksum }` by splitting
  the trailing 4 bytes (Adler-32) off the body.

- **`zlibUncompressedCoder()`** — wraps the compressed coder in
  another `refine()` that runs `unzlibSync` on decode and
  `zlibSync` on encode (via [`fflate`](https://github.com/101arrowz/fflate)),
  producing `{ header, uncompressed, checksum }`.

`fflate` is the single external compression dependency. The PNG
package does not implement deflate itself.

**Lossy round-trip on compression level.** This is documented
inline (`TODO` in `zlib.ts`) and accepted: the encode path maps
the original `FLEVEL` to a best-effort fflate compression level,
but `FLEVEL=0` cannot distinguish "store" from "fastest". For
use cases that require byte-identical re-encoding, the consumer
must use `zlibCompressedCoder()` directly (no decompression) and
keep the original deflate stream.

## Consequences

- **Two-stage refinement is the public shape.** Consumers
  interested in raw deflate bytes use `zlibCompressedCoder`;
  consumers wanting decompressed image data use
  `zlibUncompressedCoder` (what `IDAT` refinement uses).
- **Image decoding is one call.** `decode(pngFile(), bytes)` →
  `idat.data.uncompressed` is the decompressed pixel stream
  (post-filter, see PNG spec).
- **Re-encoding does not guarantee byte-identical IDAT.**
  Round-trip `parse → serialize` of a PNG with `FLEVEL=0` may
  produce slightly different IDAT bytes. The image content is
  preserved; the compressed representation may differ.
- **`fflate` is a hard runtime dependency.** Replacing it would
  require a coder-level migration; the choice is recorded so
  future swaps go through ADR review.
- **Adler-32 checksums are preserved verbatim.** They are not
  recomputed; if a consumer modifies `uncompressed`, they must
  recompute the checksum themselves before encoding (or expect
  an invalid zlib stream).

## References

- `zlib/zlib.ts` — `zlibCompressedCoder`, `zlibUncompressedCoder`,
  `zlibFLevel2Clevel` (the lossy mapping), inline `TODO`
- `zlib/header.ts` — `zlibHeaderCoder`, `ZlibHeader`
- `chunks/idat.ts` — IDAT refiner using `zlibUncompressedCoder`
- [`fflate`](https://github.com/101arrowz/fflate) — external
  compression library
