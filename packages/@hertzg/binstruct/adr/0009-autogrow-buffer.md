# ADR 0009 — `autoGrowBuffer`: opt-in exponential growth via `RangeError` retry

**Status:** Accepted

## Context

Most encode operations have a known maximum size — fixed-shape headers,
records with bounded fields. Callers allocate a `Uint8Array(N)` and are
done. But variable-length data (length-prefixed arrays of variable size,
refined byte payloads, deeply nested structures) may have unbounded
encoded size.

Two bad options:

1. **Force every caller to pre-compute the maximum bound.** Defeats
   ergonomics; some structures don't have a tight upper bound.
2. **Auto-grow on every encode.** Forces an allocation strategy on
   callers who already know their size, and couples primitive coders to
   a buffer-management policy.

We want the strategy to be **opt-in** and **separate** from the core
coder protocol (ADR 0001 — primitives never own buffers).

## Decision

`autoGrowBuffer(tryEncodeFn, opts?)` is a separate utility:

```ts ignore
function autoGrowBuffer<T>(
  tryEncodeFn: (buffer: Uint8Array) => T,
  opts?: AutogrowOptions,
): T;
```

Behavior:

1. Allocates a resizable `ArrayBuffer({ maxByteLength })` with
   `initialSize` bytes (default 4 KB).
2. Calls `tryEncodeFn(buffer)`.
3. If it throws `RangeError` (the conventional signal "the buffer was
   too small"), grows the buffer by `growthFactor` (default 2×) and
   retries.
4. Caps growth at `maxByteLength` (default 400 MB). If the next growth
   step would exceed it, throws a `RangeError` with a clear message.
5. **Non-`RangeError` exceptions propagate unchanged.** Encoding errors
   that aren't size-related don't trigger retry.

**Safeguards against infinite loops:**

- `growthFactor > 1` is validated at entry.
- `Math.max(Math.trunc(size * factor), size + 1)` ensures the buffer
  grows by at least one byte even when truncation would leave it
  unchanged.
- `initialSize ≤ maxByteLength` is validated.

## Consequences

- **Core coders never allocate.** They write into a slice of someone
  else's buffer (per ADR 0001). Encoding into a too-small buffer is a
  `RangeError` from `DataView` / `set` — the conventional
  signal-from-below.
- **Coders don't know they're inside a growable buffer.** They throw
  `RangeError` as if the caller passed a too-small array; `autoGrowBuffer`
  catches it and retries.
- **Callers who know their size skip the helper entirely:**
  `coder.encode(value, new Uint8Array(N))`.
- **Callers who don't:** wrap with `autoGrowBuffer` directly, or use the
  `encode()` top-level helper (ADR 0010), which wraps it with sensible
  defaults.
- **The growth strategy is exposed for tuning.** Callers with known
  rough sizes can pass `initialSize`; callers worried about runaway
  growth can pass a smaller `maxByteLength`.

## References

- `buffer.ts` — `autoGrowBuffer`, `AutogrowOptions`
- ADR 0001 — Coder protocol (primitives don't own buffers)
- ADR 0010 — `encode` / `decode` top-level helpers
