# ADR 0010 — `encode` / `decode` top-level helpers as the ergonomic API

**Status:** Accepted

## Context

The raw `Coder` API (ADR 0001) is monomorphic and composable, but
pedantic for end users:

- `coder.encode(value, target)` returns bytes-written; the caller has
  to `target.subarray(0, n)` to get the meaningful slice.
- `coder.decode(buffer)` returns `[value, bytesRead]`; most callers
  want just the value.
- Buffer allocation is the caller's problem — even when the size is
  unknown.

That's the right surface for a **primitive**, but not for an
application's first interaction with the library.

## Decision

Two top-level helpers wrap the raw API:

```ts ignore
function encode<T>(
  coder: Coder<T>,
  data: T,
  ctx?: Context,
  target?: Uint8Array,
  autogrowOptions?: AutogrowOptions,
): Uint8Array;

function decode<T>(
  coder: Coder<T>,
  buffer: Uint8Array,
  ctx?: Context,
): T;
```

Behavior:

- **`encode`** — if `target` is given, encode into it and return
  `target.subarray(0, bytesWritten)`. If not, allocate via
  `autoGrowBuffer` (ADR 0009) and return the trimmed slice.
- **`decode`** — drop the bytes-read, return only the value.

Both helpers create a fresh `Context` if none is given, so nested calls
share state automatically (per ADR 0002).

These are the **recommended entry points** for application code. The
raw `coder.encode` / `coder.decode` remain public for cases that need
precise byte counts (composing into a larger format outside the library,
streaming-style cursoring across multiple values in one buffer).

## Consequences

- **Application code reads cleaner:**
  ```ts ignore
  const bytes = encode(packet, value);          // helper
  // vs
  const buf = new Uint8Array(N);                 // raw
  const n = packet.encode(value, buf);
  const bytes = buf.subarray(0, n);
  ```
- **Helpers are the on-ramp; the raw API is the underlying mechanism.**
  Both are public, both documented.
- **`decode` discards bytes-read.** Callers who need to advance a
  cursor across multiple values in one buffer must drop down to
  `coder.decode` directly. The helper's JSDoc shows this case.
- **Helpers enforce the `Context` lifecycle.** A top-level call always
  has a context; nested calls inherit it.

## References

- `helpers.ts` — `encode`, `decode`
- ADR 0001 — Coder protocol
- ADR 0002 — Context threading
- ADR 0009 — `autoGrowBuffer`
