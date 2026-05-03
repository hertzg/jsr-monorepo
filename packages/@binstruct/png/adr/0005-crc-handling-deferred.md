# ADR 0005 — CRC validation is the caller's responsibility; `chunkCrc()` is exposed as a helper

**Status:** Accepted

## Context

Every PNG chunk carries a 4-byte CRC-32 over `type || data`. The
chunk coder reads/writes that field as `u32be`, but it does not
have to be the one that *checks* or *recomputes* it. The
question is whether to:

- Validate on decode and throw on mismatch.
- Recompute on encode and overwrite whatever the caller passed.
- Leave the field as a plain wire-format value and expose a
  helper.

The repo's no-defensive-programming rule (root ADR 0006) leans
the third way: don't validate inputs the call site doesn't
demand validation for. PNG-handling tools have legitimately
different needs:

- A reader that trusts the file may want to skip CRC validation
  for speed.
- A reader that distrusts the file may want to validate and
  decide what to do on mismatch (warn? fail? continue?).
- A rewriter that's modifying chunks must recompute the CRC.
- An inspector reading malformed files needs the original CRC
  preserved even if it's wrong.

Each of these is a different policy. The library shouldn't
pick one.

## Decision

The chunk coder treats `crc` as opaque:

- **On decode**, the 4 CRC bytes are read into the `crc` field
  as a `u32be`. No validation. The caller compares to a fresh
  `chunkCrc(chunk)` if they want to verify.
- **On encode**, the `crc` field on the chunk object is written
  to the buffer verbatim. No recomputation. The caller updates
  `crc` before encoding if they want a correct file.

The package exposes **`chunkCrc()`** as the helper for both
purposes:

```ts ignore
chunkCrc(bytes: Uint8Array): number;
chunkCrc(chunk: { type: Uint8Array; data: Uint8Array }): number;
```

It uses `crc32` from `@hertzg/crc` and concatenates `type || data`
when given a chunk object.

## Consequences

- **Reading a PNG with a wrong CRC succeeds.** The caller sees
  the wire-format `crc` value and can compare to `chunkCrc(chunk)`
  on their own.
- **Writing a chunk with a stale `crc` produces a file with a
  stale CRC.** Caller must recompute before encoding. This is
  intentional; tools that round-trip without modification benefit
  from preserving the original.
- **No "auto-fix" on encode.** Chunks pass through unchanged at
  the byte level except for the parts the caller explicitly
  modifies.
- **The helper covers refined chunks too** — pass `{type, data}`
  with `type` as the original `Uint8Array`. (Refined chunks have
  `type: string` literal; recompute against the byte form by
  re-encoding the type with `string(4)` first.)
- **CRC errors are not in scope for the package.** A tool built
  on top can raise or recover however it wants.

## References

- `mod.ts` — `chunkCrc` helper with the two overloads
- `pngChunkUnknown()` — encodes/decodes `crc: u32be` opaquely
- `@hertzg/crc` — `crc32` implementation
- Repo ADR 0006 — No defensive programming
