# ADR 0003 — References resolve by coder identity; single-pass forward-only

**Status:** Accepted

## Context

Length-prefixed and computed-length fields are everywhere in binary
formats: a `u32` count followed by N items, a header that says how many
bytes follow, a chunk whose CRC covers the previous fields. Naive
solutions:

- **Two-pass decoding** — first pass reads counts, second pass uses them.
  Doubles work, incompatible with single-pass byte layout.
- **Field-name lookup** — `ref("count")` resolved by string. Brittle
  (typos, nested-struct ambiguity), forces a name dictionary alongside the
  schema.
- **Lookahead / buffering** — needs streaming machinery and breaks on
  unbounded inputs.

The library wants a streaming-shaped, single-pass decoder where length
information is available the moment it's needed.

## Decision

`ref(coder)` returns a deferred lookup function. At resolution time, it
looks up the coder in `ctx[kCtxRefs]` (a WeakMap, see ADR 0002). The map
is populated as encoding/decoding progresses — coders publish their
value via `refSetValue(ctx, self, …)` immediately after producing it.

This makes the system **single-pass and forward-only**:

- A `ref()` resolves only against fields decoded **earlier** in the same
  operation.
- Backward references (referring to a field that hasn't been decoded yet)
  throw — the coder isn't in the WeakMap.
- Field order in struct schemas is part of the API contract; reordering
  fields can break refs.

`computedRef([refs], fn)` composes refs into a derived value, evaluated
at resolution time after all input refs are populated.

Reference identity is per-coder-instance. `u32le()` called twice produces
two distinct coders with two distinct WeakMap keys. The convention for
shared lengths is: name the coder once, reuse it.

```ts
const length = u32le();        // shared coder
const data = struct({
  length,                       // populates the WeakMap entry for `length`
  payload: bytes(ref(length)), // resolves against that entry
});
```

## Consequences

- **No lookahead, no buffering** — encode and decode stream forward.
- **Field order matters.** Reordering struct fields can break references.
  Reviewers and JSDoc must surface the dependency.
- **For "the length depends on a later field" cases**, the workaround is
  to compute the length up-front during encode, store it in an earlier
  field, and reference *that* field. The repo AGENTS.md has a
  `fileWithPadding` example.
- **No string-keyed refs** — typos turn into compile-time mistakes (you
  can't pass a non-coder to `ref()`).
- **Inline anonymous coders can't be referenced** — if you want to
  reference a length, name it. This is by design; otherwise refs would be
  ambiguous.

## References

- `ref/ref.ts` — `ref`, `computedRef`, `RefValue`, `kIsRefValue`
- `length.ts` — `LengthOrRef`, `lengthRefGet`, `lengthRefSet`
- AGENTS.md "Forward-Only References"
- ADR 0001 — Coder protocol
- ADR 0002 — Context threading
