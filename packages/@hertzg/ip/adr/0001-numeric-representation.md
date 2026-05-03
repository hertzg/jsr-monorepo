# ADR 0001 — Numeric representation: IPv4 = `number`, IPv6 = `bigint`

**Status:** Accepted

## Context

An IP address library has to pick a representation. Common options:

- A wrapper class with internal storage (`new IpAddress("10.0.0.1")`).
- A byte array / `Uint8Array`.
- A string, parsed on every operation.
- The natural integer type — 32-bit for IPv4 (fits in `number`), 128-bit
  for IPv6 (needs `bigint`).

Wrapper classes need methods for every operation, force allocations, and
fight tree-shaking. Byte arrays make arithmetic (`addr + 1`,
`addr & mask`) verbose. Strings re-parse constantly.

The natural-integer form lines up with how kernels and protocols already
think about addresses: a 32-bit unsigned for IPv4, a 128-bit unsigned for
IPv6. JS provides exactly these — `number` (safe up to 2⁵³) and
`bigint` (arbitrary precision).

## Decision

- **IPv4 addresses are `number`** — 32-bit unsigned integer, range
  `0` … `0xFFFFFFFF`.
- **IPv6 addresses are `bigint`** — 128-bit unsigned integer, range
  `0n` … `(1n << 128n) - 1n`.

The IP version is **encoded in the type itself** — not in a tag field,
not in a wrapper. A `number` is IPv4; a `bigint` is IPv6. TypeScript
discriminates them statically; `typeof` discriminates them at runtime.

CIDR shapes inherit from this: `Cidrv4 = { address: number; prefixLength: number }`,
`Cidrv6 = { address: bigint; prefixLength: number }`. See ADR 0003.

## Consequences

- **Arithmetic is direct.** `cidrv4Contains` is `(ip & mask) === network`.
  `cidrv4Addresses` is `for (let a = first; a <= last; a++) yield a`.
  No method calls, no allocations.
- **Comparison and equality are primitive.** `addr === otherAddr`,
  `addr < limit` — no `equals()` method.
- **No address class.** There is no `Address` type to construct,
  validate, or wrap. Functions take primitives, return primitives.
- **`typeof` is the runtime discriminator.** `typeof addr === "number"`
  → IPv4, `typeof addr === "bigint"` → IPv6. Used by `parseIp`,
  `stringifyIp`, and CIDR universal helpers.
- **JSON-friendly with one caveat.** Numbers serialize natively;
  `bigint` does not — callers serializing IPv6 need
  `stringifyIpv6(addr)` first.
- **Mixing versions is a type error at the call site.** `addr + 1n`
  is rejected by TypeScript when `addr: number`. The version split is
  surfaced in the type, not deferred to runtime.

## References

- `ipv4.ts`, `ipv6.ts` — `parseIpv4`, `parseIpv6`, `stringifyIpv4`,
  `stringifyIpv6`
- ADR 0003 — `Cidrv4` / `Cidrv6` are plain objects
- Repo ADR 0008 — Named exports; types alongside implementation
