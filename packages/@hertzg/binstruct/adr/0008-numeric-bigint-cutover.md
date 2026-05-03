# ADR 0008 — 64-bit numerics return `bigint`; ≤32-bit return `number`

**Status:** Accepted

## Context

JavaScript numbers are IEEE-754 doubles. Their safe-integer range tops
out at `2^53 − 1` (`Number.MAX_SAFE_INTEGER`). A 64-bit unsigned integer
can exceed that range; a 64-bit signed integer can too. Silently
storing a `u64` value as a `number` would corrupt it for values above
the safe range — round-trips would fail with no error.

`DataView.getBigUint64` / `getBigInt64` exist precisely so that the JS
side can hold 64-bit integer values exactly. They return `bigint`.

Three options:

1. **Always `number`** — silent precision loss above 2^53. Rejected.
2. **Always `bigint`** — every `u8` returns a bigint; callers do
   `Number(x)` everywhere. Heavy ergonomic tax for the common case.
3. **Cutover at the size boundary** — `number` for sizes that fit,
   `bigint` for sizes that don't.

We picked #3.

## Decision

Numeric coder return types follow a hard cutover at 32 bits:

| Coder factories                      | Returns         |
| ------------------------------------ | --------------- |
| `u8`, `u16`, `u32`, `s8`, `s16`, `s32` | `Coder<number>` |
| `u64`, `s64`                         | `Coder<bigint>` |
| `f16`, `f32`, `f64`                  | `Coder<number>` |

64-bit integers always go through `BigUint64Array` / `BigInt64Array` /
`DataView.getBigUint64` / `getBigInt64`.

## Consequences

- **No silent precision loss.** A `u64` value of `2^60` round-trips
  exactly because it's never coerced to `number`.
- **Type errors are loud.** Mixing `bigint` and `number` is a TS
  compile error — `n + 1` doesn't compile if `n` is `bigint`. Callers
  see the type boundary immediately.
- **Floats stay `number`** even though `f64`'s integer range matches
  `u53`. Floats are their own thing; JS has no `BigFloat`, and treating
  them as bigint would make math harder than it needs to be.
- **Tests use `…n` literals for 64-bit values** (`12345n`).
  `JSON.stringify` of bigint throws; serialization needs a `replacer`.
  This is a known JS-level cost, not specific to this library.
- **`bitStruct` fields are capped at 32 bits** for the same reason
  (ADR 0007): they decode as `number`. Larger fields belong in `struct`
  with a 64-bit coder.

## References

- `numeric/unsigned.ts`, `numeric/signed.ts`, `numeric/floats.ts`
- `numeric/dataview.ts` — `dataViewType` factory dispatching to the
  matching `DataView` method
- ADR 0007 — `bitStruct` is separate from `struct`
