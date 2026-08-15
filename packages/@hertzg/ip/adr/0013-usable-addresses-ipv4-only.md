# ADR 0013 — Usable-address helpers are IPv4-only

**Status:** Accepted

## Context

`cidrv4FirstUsableAddress` and its siblings carve the network and
broadcast addresses out of an IPv4 block. The obvious next request is the
IPv6 equivalent, and there is no agreed answer to what it would mean.

IPv4 has a blanket rule: within a subnet the all-zeros host part is the
network address and the all-ones host part is the directed broadcast, and
neither is assignable (RFC 1812 §5.3.5). RFC 3021 re-permits both on a
`/31`, and a `/32` is a single host route. Three cases, all settled by
standards.

IPv6 has no such rule. There is no broadcast address. The one candidate
is the Subnet-Router anycast — the all-zeros interface identifier
(RFC 4291 §2.6.1) — and it is a **per-link** reservation, not a blanket
one: RFC 6164 explicitly assigns both addresses of a `/127` to the two
routers on an inter-router link.

The ecosystem splits accordingly. Python's `ipaddress` excludes the
anycast, so `2001:db8::/126` yields 3 addresses. Rust's `ipnet` excludes
nothing, so the same prefix yields 4.

## Decision

No `cidrv6FirstUsableAddress`, no `cidrUsableAddresses`, no `cidrHosts`.
The usable-address vocabulary is IPv4-only, and the `cidrv4` qualifier is
what says so.

Callers on a link that does reserve the anycast skip it themselves:
`cidrv6Addresses(cidr, { offset: 1n })`.

The *block bounds*, by contrast, are version-agnostic and get the full
three-arm treatment every other CIDR operation has:

| Concept | Universal | IPv4 | IPv6 |
| --- | --- | --- | --- |
| First address | `cidrFirstAddress` | `cidrv4FirstAddress` / `cidrv4NetworkAddress` | `cidrv6FirstAddress` |
| Last address | `cidrLastAddress` | `cidrv4LastAddress` / `cidrv4BroadcastAddress` | `cidrv6LastAddress` |
| First usable | — | `cidrv4FirstUsableAddress` | — |
| Last usable | — | `cidrv4LastUsableAddress` | — |
| Usable count | — | `cidrv4UsableSize` | — |
| Usable addresses | — | `cidrv4UsableAddresses` | — |

The dashes are this decision. The IPv4 column having two names per bound
is the RFC vocabulary sitting alongside the version-neutral one; the IPv6
column has one name because IPv6 has no network or broadcast address to
name.

## Consequences

- **Both ecosystem answers were available and both declined.** Python
  encodes a per-link decision as a library-wide rule. Rust keeps the name
  but carves out nothing, which would make `cidrv6FirstUsableAddress` a
  literal alias of `cidrv6FirstAddress`.
- **The absence is documented, not enforced.** Nothing stops a future
  author adding `cidrv6FirstUsableAddress`; this ADR and the
  **Usable address** glossary entry are what they should find first.
- **The universal layer keeps a defined meaning for every operation.**
  `cidrUsableAddresses(cidr)` would mean "minus two addresses" or "minus
  one" depending on a runtime type — the silent version-dependent
  semantics ADR 0005 rejects. `cidrFirstAddress` / `cidrLastAddress` are
  safe there precisely because they carry no policy: the versions differ
  in the return *type*, not in the *rule*, exactly as `cidrSize` does.
- **One address in 2⁶⁴ rarely matters**, but the prefixes where it does —
  `/126`, `/127`, `/112` — are exactly the ones inter-router links use.

## References

- `cidr.ts` — `cidrFirstAddress`, `cidrLastAddress` (version-agnostic bounds)
- `cidrv4.ts` — the IPv4-only usable-address helpers
- `CONTEXT.md` — **Usable address** glossary entry
- RFC 1812 §5.3.5, RFC 3021 — the IPv4 carve-out and its `/31` exception
- RFC 4291 §2.6.1, RFC 6164 — Subnet-Router anycast, and `/127` links
- ADR 0005 — universal CIDR operations refuse ambiguous cross-version
  semantics
