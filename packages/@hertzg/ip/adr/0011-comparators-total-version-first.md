# ADR 0011 — Comparators are total and version-first; they never throw on mixed versions

**Status:** Accepted

## Context

ADR 0005 says universal CIDR operations throw `TypeError` when their
arguments are mixed versions. `compareIp` and `compareCidr` are
universal operations over `Address` and `Cidr`, so the rule as written
would make them throw too.

That cannot work. A comparator exists to be handed to
`Array.prototype.sort` / `toSorted`, and sorting a mixed-family list is
the main reason to want one — a log of dual-stack clients, a geo-IP
table, a firewall ruleset. A throwing comparator turns that into a
crash whose position depends on the sort implementation's pivot
choices. There is no useful "handle the error" path either: the caller
would have to pre-partition by version, at which point the universal
comparator has no reason to exist.

The reference implementations were checked:

- **Go `net/netip`** — `Addr.Compare` is total and version-first.
  Verified: sorting `[2001:db8::1, 10.0.0.1, ::1, ::ffff:10.0.0.1]`
  yields `[10.0.0.1, ::1, ::ffff:10.0.0.1, 2001:db8::1]`. The godoc
  says "IP addresses sort first by length, then their address."
- **Rust `std::net::IpAddr`** — `enum { V4, V6 }` with a derived
  `Ord`, so `V4 < V6` unconditionally.
- **Python `ipaddress`** — cross-version `<` raises `TypeError`, and
  the documentation's own workaround is
  `sorted(addrs, key=lambda a: (a.version, a))`, which is exactly
  version-first. Python's error is a consequence of overloading the
  `<` operator, which carries meaning the library does not want to
  claim; a named function has no such problem.
- **PostgreSQL `inet` / `cidr`** — documented, verbatim: "When
  sorting `inet` or `cidr` data types, IPv4 addresses will always sort
  before IPv6 addresses, including IPv4 addresses encapsulated or
  mapped to IPv6 addresses, such as `::10.2.3.4` or `::ffff:10.4.3.2`."

Only `ip6addr` interleaves the two families, and it does so by treating
IPv4 as its IPv4-mapped IPv6 form — precisely the implicit conversion
ADR 0004 and ADR 0005 exist to prevent.

For CIDR blocks specifically there is less precedent to copy. Go has a
`netip.Prefix.compare`, but it is deliberately unexported; the comment
above it reads "Unexported for Go 1.22 because we may want to compare
by `p.Addr` first." Its current shape sorts by prefix length before
address, which groups every `/8` in the list ahead of every `/24`
regardless of where they start — not what a caller sorting a routing
table wants. PostgreSQL sorts by network address first, and so does
the sort already inside `cidrv4Merge` / `cidrv6Merge`.

## Decision

**Comparators are the carve-out from ADR 0005.** They are total,
infallible, and version-first.

- `compareIp(a, b)` and `compareCidr(a, b)` accept any mix of IPv4 and
  IPv6 arguments and return `-1 | 0 | 1`. They never throw.
- **All IPv4 sorts before all IPv6.** A `number` is less than every
  `bigint`; a `Cidrv4` is less than every `Cidrv6`.
- **Within a version, order is numeric ascending** on the address.
- **CIDR blocks tie-break on prefix length ascending** — the shorter
  prefix (the larger block, the supernet) sorts *before* the longer
  one. This matches PostgreSQL's `network_cmp_internal`, whose
  documented rule is "first on the common bits of the network part,
  then on the length of the network part", implemented as
  `ip_bits(a1) - ip_bits(a2)`.
- **Comparators do not mask.** `compareCidr` orders the block as
  written, on the `address` field as stored. It does not apply the
  network mask first.
- **No unwrapping of IPv4-mapped IPv6.** `compareIp` compares the
  values it is given. A mapped address held as a `bigint` is an IPv6
  value and sorts in the IPv6 half, after every IPv4 value —
  `compareIp(parseIpv6("::ffff:10.0.0.1"), parseIpv4("10.0.0.1"))` is
  `1`, not `0`. This matches Go and PostgreSQL.
- **Version-specific comparators ship alongside** — `compareIpv4`,
  `compareIpv6`, `compareCidrv4`, `compareCidrv6` — per the v4/v6
  split of ADR 0002. Where the version is already known statically,
  they skip the dispatch.

### Why this does not contradict ADR 0005

ADR 0005 throws where the answer would require an implicit conversion
to exist at all. "Does `10.0.0.0/8` contain `2001:db8::/32`?" has no
answer without deciding that IPv4 lives somewhere inside IPv6 — the
address spaces are disjoint, so the only honest response is to reject
the question.

Ordering is not that question. A total order over a disjoint union
needs no conversion: order the two halves internally, then declare
which half comes first. The result is defined for every pair without
claiming any relationship between the two address spaces. It says
IPv4 values sort first; it does not say they are smaller as
addresses.

The line, then, is not "universal operations throw" but **"operations
whose result would depend on an implicit cross-version conversion
throw."** Containment, overlap, intersection and subtraction fall on
one side; ordering falls on the other.

## Consequences

- **`toSorted(compareIp)` works on a mixed list.** The primary use
  case is supported without pre-partitioning.
- **ADR 0005 keeps its rule for the five operations it names.**
  `cidrContainsCidr`, `cidrOverlaps`, `cidrIntersect`, `cidrSubtract`
  and `cidrMerge` still throw on mixed versions. This ADR adds
  comparators to the package; it removes nothing.
- **`cidrMerge` still throws on a mixed array** even though the sort
  inside it no longer needs to. Merging asks the containment
  question, not the ordering question.
- **The comparators are the single sort implementation.**
  `cidrv4Merge` and `cidrv6Merge` sort with `compareCidrv4` /
  `compareCidrv6` rather than an inline arrow, so there is one
  definition of CIDR order in the package. Both normalize to network
  addresses before sorting, so their behavior is unchanged.
- **Sorted output reads as sorted.** Because comparators do not mask,
  a list of blocks carrying host bits sorts by the address
  `stringifyCidr` will print. A masking comparator would order
  `10.0.0.5/24` as if it were `10.0.0.0/24` while still printing
  `10.0.0.5/24`, and the output would look wrong. Callers who want
  blocks ordered by their network address normalize with
  `cidrv4NetworkAddress` / `cidrv6FirstAddress` first.
- **`compareCidr` returning `0` means "same address and same prefix
  length"** — not "same address space". `10.0.0.5/24` and
  `10.0.0.0/24` cover the same addresses and do not compare equal.
- **`-1 | 0 | 1`, not `number`.** The sign is the whole contract; a
  magnitude would invite reading meaning into it. `ip6addr`'s
  `compareCIDR('10.0.0.0/8', '10.0.0.0/16')` returns `8`, which is a
  prefix-length difference leaking through a comparator's return
  value.

## References

- `ip.ts` — `compareIp`; `ipv4.ts` — `compareIpv4`; `ipv6.ts` —
  `compareIpv6`
- `cidr.ts` — `compareCidr`; `cidrv4.ts` — `compareCidrv4`;
  `cidrv6.ts` — `compareCidrv6`
- ADR 0001 — IPv4 is `number`, IPv6 is `bigint`; the primitive type
  carries the version
- ADR 0004 — universal parsers auto-unwrap IPv4-mapped IPv6, so a
  mapped `bigint` only reaches a comparator via `parseIpv6` /
  `parseCidrv6`
- ADR 0005 — cross-version CIDR operations throw; amended by this ADR
- PostgreSQL, `src/backend/utils/adt/network.c` —
  `network_cmp_internal`
- Go, `net/netip` — `Addr.Compare`
