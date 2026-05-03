# ADR 0004 — Refiner is a factory `(...args) => Coder<TRefined>`, not a coder directly

**Status:** Accepted

## Context

Refiners transform decoded values into domain-shaped values: a 6-byte
array becomes a MAC-address string, a `u8` becomes a value mapped into a
custom range, a length-prefixed string becomes a `Date`. Some refinements
need parameters — a `u8` mapped to `[min, max]` needs the min and max.

If `refine(base, refiner)` returned a `Coder` directly, parameterizing
would require either:

- Closing over args at construction time (loses the ability to vary args
  per use site)
- A second wrapper function the caller writes themselves
- Hidden mutable state on the coder

None of these compose well.

## Decision

`refine(base, refiner)` returns a **factory function**:

```ts ignore
function refine<TUnrefined, TRefined, const TArgs extends unknown[] = []>(
  coder: Coder<TUnrefined>,
  refiner: Refiner<TUnrefined, TRefined, TArgs>,
): (...args: TArgs) => Coder<TRefined>;
```

Args flow through to both `refiner.refine(unrefined, ctx, ...args)` and
`refiner.unrefine(refined, ctx, ...args)`. The factory shape mirrors
primitive coders (`u16le()`, `string(4)`) — every coder is constructed
via a function call.

```ts ignore
const u8Mapped = refine(u8(), {
  refine: (n, _ctx, min: number, max: number) =>
    (min + (max - min) * n / 0xff) >>> 0,
  unrefine: (v, _ctx, min: number, max: number) =>
    ((v - min) / (max - min) * 0xff) >>> 0,
});

const tempCoder = u8Mapped(-100, 100);  // one factory, many configurations
const altitudeCoder = u8Mapped(0, 30000);
```

`TArgs` uses `const T extends unknown[] = []` for tuple-precision
inference, so each factory's arg list is typed exactly.

## Consequences

- **Parameterized refiners are first-class.** Same refiner, different
  parameters per use site.
- **No-arg refiners still need to be called.** `refine(u8(), {…})()` —
  paren-paren. Acceptable cost for uniformity with primitive coders.
- **Refiners can be stored and named.** A package can export
  `const macAddr = refine(array(u8be(), 6), {…})` as a reusable factory.
- **Symmetric encode/decode.** The refiner's `refine` and `unrefine` see
  the same args, the same context, and produce inverses.

## References

- `refine/refine.ts` — `refine`, `Refiner`
- ADR 0005 — `refineSwitch` dispatches on a host field
