# ADR 0005 — Universal CIDR operations throw `TypeError` on cross-version arguments

**Status:** Accepted — amended by ADR 0011

## Context

Universal CIDR operations (`cidrContainsCidr`, `cidrOverlaps`,
`cidrIntersect`, `cidrSubtract`, `cidrMerge`) accept `Cidr =
Cidrv4 | Cidrv6` arguments. When the runtime types disagree —
one IPv4 CIDR and one IPv6 CIDR — there is no meaningful answer
without an implicit conversion.

Two reasonable behaviors:

- **Silent false / empty.** Return `false` for containment/overlap,
  `null` for intersect, the original for subtract, etc. Easy to
  ignore, easy to misuse — a typo that mixes versions silently
  passes guards.
- **Throw.** Force the caller to acknowledge the version mismatch.

Since asking a containment question across versions is almost always a
programmer error
(IPv4 and IPv6 address spaces are disjoint at the type level — see
ADR 0001), surfacing it loudly is the safer default.

## Decision

Universal CIDR operations whose result would depend on an implicit
cross-version conversion throw `TypeError` when their arguments are
mixed versions:

- `cidrContainsCidr(v4, v6)` → `TypeError`
- `cidrOverlaps(v4, v6)` → `TypeError`
- `cidrIntersect(v4, v6)` → `TypeError`
- `cidrSubtract(v4, v6)` → `TypeError`
- `cidrMerge([v4, v6, …])` → `TypeError` (all elements must be
  the same version)

The TypeScript signature uses a generic `T extends Cidr` so the
mixed-version case is rejected at compile time when types are
known; the runtime check covers cases where types widen to `Cidr`.

Callers who genuinely want one of these operations across versions
convert explicitly via the `4to6` submodule before calling.

Ordering does not fall under this rule: a total order over a disjoint
union needs no conversion, so `compareIp` and `compareCidr` are total,
version-first, and never throw. See ADR 0011.

## Consequences

- **Programmer errors are loud.** A typo or accidental version mix
  surfaces immediately with a `TypeError`, not a silent `false`.
- **Generic constraint catches most mistakes at compile time.**
  `cidrContainsCidr<T extends Cidr>(outer: T, inner: T)` rejects
  mixed `Cidrv4` / `Cidrv6` arguments before runtime.
- **Callers needing containment or overlap across versions** convert
  via `cidrv4ToCidrv64Mapped` first, then call IPv6 operations.
- **`TypeError` (not `RangeError` or custom error)** matches the
  semantic: the operation isn't defined on these types together.
- **No silent conversion.** The library never auto-maps IPv4 → IPv6
  for comparison purposes; all conversions go through the explicit
  `4to6` API (see ADR 0004).

## References

- `cidr.ts` — `cidrContainsCidr`, `cidrOverlaps`, `cidrIntersect`,
  `cidrSubtract`, `cidrMerge`
- ADR 0001 — Numeric representation: IPv4 and IPv6 are different
  primitive types
- ADR 0004 — `4to6` is the explicit conversion API
- ADR 0007 — Address-in-CIDR containment (`cidrContains`) returns
  `false` across versions instead
- ADR 0011 — comparators are total and version-first; ordering needs
  no conversion and so does not fall under this rule
