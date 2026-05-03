# ADR 0001 — Coder protocol: `encode`/`decode` with `[value, bytesRead]`

**Status:** Accepted

## Context

A binary codec library can take many shapes. Some return `(value, offset)`
tuples that require external cursor management. Some mutate offset state on
a builder object. Streaming libraries return iterators. The library wants
**composability** — a coder for an array of structs is a coder, callable in
the same way as a primitive — so the protocol must be uniform across
primitives and compounds.

The chosen shape also has to support the no-defensive-programming rule
(repo ADR 0006): no buffer-bounds checks, no type guards on inputs, fail
fast only at genuine boundaries. That rules out shapes where the coder
"knows" about the buffer's total length or owns it.

## Decision

A `Coder<T>` is a plain object:

```ts ignore
type Coder<T> = {
  encode: (value: T, target: Uint8Array, ctx?: Context) => number;
  decode: (buffer: Uint8Array, ctx?: Context) => [T, number];
};
```

- **`encode`** writes into `target` (a `Uint8Array` slice the caller owns)
  and returns bytes written.
- **`decode`** reads from `buffer` and returns a tuple `[value, bytesRead]`.

The tuple return for decode is monomorphic — every coder, regardless of
what type it produces, returns `[T, number]`. Encode returns just the byte
count; the caller already has the value.

## Consequences

- **No global cursor state.** Each call returns its own byte count; parents
  compute their own cursor by summing children's results.
- **Composition is trivial.** `struct` is a `for` loop that does
  `cursor += child.encode(value[key], target.subarray(cursor), ctx)`.
- **Cursor arithmetic is the parent's job**, not a primitive's. Primitives
  never seek the buffer.
- **Buffer ownership lives outside the coder.** The caller decides the
  `Uint8Array`; the coder writes into it. See ADR 0009 for opt-in growth.
- **The shape is the contract.** Anything implementing `encode` and
  `decode` with these signatures composes with everything else.

## References

- `core.ts` — `Coder<T>`, `Encoder`, `Decoder`, `isCoder`
- Repo ADR 0006 — No defensive programming
