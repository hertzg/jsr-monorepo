# ADR 0002 — Context threading, no global state

**Status:** Accepted

## Context

Encode/decode operations need shared state during a single call: which
references have been resolved, what direction we're going, sometimes
auxiliary data. Three obvious options:

1. **Module-level globals** — breaks parallelism (concurrent encodes
   collide), makes tests stateful, requires reset hooks.
2. **An OOP `Encoder` / `Decoder` class** — turns every coder into a
   stateful object, conflicts with the function-first rule (repo ADR 0008),
   and forces inheritance trees.
3. **A context object threaded through every call** — explicit, stateless
   between operations, parallelism-safe.

We picked #3.

## Decision

Every `encode`/`decode` accepts an optional `Context`. Top-level calls
create it via `createContext(direction)`; nested coders forward the same
context they received. The context carries:

```ts
interface Context {
  direction: "encode" | "decode";
  [kCtxRefs]?: WeakMap<Coder<unknown>, unknown>;
}
```

Coders that participate in the reference system (`struct`, `refine`,
`refineSwitch`, every numeric coder) call `refSetValue(ctx, self, value)`
to publish their value, making it visible to any `ref(self)` resolved
later in the same operation.

The WeakMap is keyed by **coder identity**, not name. Anonymous or
inline-constructed coders work; key collisions are impossible.

## Consequences

- **Concurrent operations don't interfere.** Two `encode()` calls on
  different threads/tasks each have their own context.
- **Tests are stateless.** Every test creates a fresh context (or lets the
  helper create one).
- **No reset hooks, no locks.** State scope = a single operation.
- **The WeakMap key is always the coder instance.** Constructing
  `u32le()` twice yields two distinct keys; if you want a shared
  reference, name the coder once and reuse it.
- **`direction` is on the context** because some refiners and refs need to
  know whether they're being asked to encode-from-refined or
  decode-to-refined; behavior can vary.

## References

- `core.ts` — `Context`, `createContext`, `kCtxRefs`
- `ref/ref.ts` — `withRefsInContext`, `refSetValue`, `refGetValue`
- ADR 0001 — Coder protocol
- ADR 0003 — References resolve by coder identity
