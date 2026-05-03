# ADR 0004 — Universal `parseIp` / `parseCidr` auto-unwrap IPv4-mapped IPv6 to the IPv4 form

**Status:** Accepted

## Context

Dual-stack servers — Deno's `Deno.listen({ hostname: "::" })`, Node's
default behavior, and Linux's `IPV6_V6ONLY=0` sockets — report IPv4
clients as **IPv4-mapped IPv6 addresses** (RFC 4291 §2.5.5.2). A
client connecting from `192.168.1.1` is reported as `::ffff:192.168.1.1`.

Almost every practical use of an address parsed from a dual-stack
socket — logging, ACL checks, geo lookups, classification — wants
the IPv4 view. Returning a `bigint` for these cases pushes the unwrap
to every caller, and most callers either forget or write the same
"if mapped, extract" boilerplate.

The alternative is to preserve the bigint and provide a separate
`unwrapIfMapped` helper. That version keeps `parseIp` symmetric with
`parseIpv6` but pessimizes the common case.

## Decision

The **universal** parsers auto-unwrap IPv4-mapped IPv6 forms:

- `parseIp("::ffff:192.168.1.1")` → `3232235777` (a `number`).
- `parseCidr("::ffff:192.168.1.0/120")` → `Cidrv4` with prefix `/24`.
- `parseCidr` only unwraps when `prefixLength >= 96`; shorter
  prefixes stay as IPv6.

The **version-specific** parsers do not unwrap:

- `parseIpv6("::ffff:192.168.1.1")` returns the full 128-bit `bigint`.
- `parseCidrv6("::ffff:192.168.1.0/120")` returns a `Cidrv6` unchanged.

Callers who need the raw mapped form use `parseIpv6` / `parseCidrv6`,
or convert explicitly via the `4to6` submodule
(`ipv4To64Mapped`, `ipv4From64Mapped`, `cidrv4ToCidrv64Mapped`,
`cidrv4FromCidrv64Mapped`).

## Consequences

- **The common dual-stack path "just works".** `classifyIp(parseIp(remote))`
  yields `"private"` for `::ffff:192.168.1.1`, not
  `"ipv4-mapped"`.
- **Round-trip is asymmetric** for mapped inputs:
  `stringifyIp(parseIp("::ffff:192.168.1.1"))` returns
  `"192.168.1.1"`, not the original. Documented at
  `parseIp`/`stringifyIp`.
- **Callers who need symmetry use the explicit version-specific
  parsers.** Their existence is part of why ADR 0002 keeps the
  v4/v6 split first-class.
- **`parseCidr` only unwraps at `/96` or longer.** A `/64` mapped
  CIDR is semantically an IPv6 block that happens to start in the
  mapped range; converting it to IPv4 would lose information.
- **The `4to6` submodule is the explicit conversion API.** Use it
  when the goal is to *produce* the mapped representation, not when
  the goal is to *interpret* incoming addresses.

## References

- `ip.ts` — `parseIp`, `stringifyIp`
- `cidr.ts` — `parseCidr`
- `4to6.ts` — `ipv4To64Mapped`, `ipv4From64Mapped`,
  `cidrv4ToCidrv64Mapped`, `cidrv4FromCidrv64Mapped`
- RFC 4291 §2.5.5.2 — IPv4-Mapped IPv6 Address
