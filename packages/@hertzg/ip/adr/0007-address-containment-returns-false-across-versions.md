# ADR 0007 — Address-in-CIDR containment returns `false` across versions

**Status:** Accepted

Refines ADR 0005, which governs CIDR-vs-CIDR operations.

## Context

ADR 0005 makes the universal CIDR-vs-CIDR operations throw `TypeError`
on mixed-version arguments. Its rationale rests on two claims:
cross-version comparison is almost always a programmer error, and
there is no meaningful answer without an implicit conversion.

`cidrContains(cidr, address)` is a different operation, and neither
claim survives the move.

**The arguments have different provenance.** In `cidrContainsCidr(outer,
inner)` both sides are developer-authored — a mismatch really is a
typo. In `cidrContains(cidr, address)` the CIDR comes from
configuration the developer wrote, and the address comes from the
network. A dual-stack listener (`Deno.listen({ hostname: "::" })`)
hands native IPv6 clients to a codebase whose trusted-proxy list is
`10.0.0.0/8`. That is ordinary traffic, not a mistake, and it happens
on the request path. Throwing turns a routine allowlist miss into an
unhandled exception in the hot path, and pushes a `typeof` guard into
every caller.

**There is a meaningful answer.** Containment asks whether an address
is a member of a set. ADR 0001 makes the two address spaces disjoint
at the type level, so an IPv6 address is definitively not a member of
an IPv4 block. `false` is the correct answer, not a fallback. That is
unlike `cidrIntersect(v4, v6)`, where "which block?" has no answer at
all, or `cidrMerge([v4, v6])`, where the result set has no single
element type.

The ecosystem agrees on the practical half. `cidr-tools`
(`containsCidr`) and `ip-address` (`isInSubnet`) both return `false`.
`ipaddr.js` (`match`) and `netmask` (`contains`) throw, and their
consumers wrap the call in `try`/`catch` or a version guard to get
`false` back.

## Decision

- **`cidrContains(cidr, address)` never throws on a version
  mismatch.** An IPv6 address is not contained in an IPv4 CIDR block,
  and the reverse; both return `false`.
- **No list wrapper.** There is no `cidrContainsAny`. Because
  `cidrContains` cannot throw, `cidrs.some((cidr) => cidrContains(cidr,
  address))` is already correct over a mixed-version list — the natural
  shape of a denylist — so a wrapper would add a name and version
  dispatch bundled with iteration control without removing a hazard.
  ADR 0005 stays unamended for list operations; `cidrMerge` still
  throws.
- **No overloads.** The signature is
  `cidrContains(cidr: Cidr, address: Address): boolean`. Version-specific
  overloads would carry no type information here: the return type is
  always `boolean`, and a catch-all `(Cidr, Address)` overload is
  required for the widened case that `parseCidr` / `parseIp` produce,
  which subsumes the narrow ones anyway. Contrast `cidrSize`, whose
  overload genuinely selects `number` versus `bigint`.
- **No implicit IPv4-mapped conversion.** ADR 0005's "no silent
  conversion" holds unchanged. Unwrapping lives in `parseIp` /
  `parseCidr` (ADR 0004), so
  `cidrContains(parseCidr("10.0.0.0/8"), parseIp("::ffff:10.1.2.3"))`
  is `true` because `parseIp` already returned a `number`, while the
  same check against `parseIpv6("::ffff:10.1.2.3")` is `false`.

## Consequences

- **The request path stays total.**
  `trusted.some((cidr) => cidrContains(cidr, parseIp(remoteAddr)))` is
  a complete guard on a dual-stack server with no `typeof` check and
  no `try`/`catch`.
- **A statically-known version mix is not a compile error.**
  `cidrContains(parseCidrv4("10.0.0.0/8"), parseIpv6("::1"))`
  typechecks and returns `false`. This is the cost of the catch-all
  signature, accepted because the widened call is the common one.
- **Two containment functions now disagree on mixed versions.**
  `cidrContainsCidr(v4, v6)` throws; `cidrContains(v4, v6Address)`
  returns `false`. The split is provenance, not inconsistency, and is
  documented at both call sites.
- **Reopening ADR 0005 for the CIDR-vs-CIDR operations is out of
  scope.** Their arguments remain developer-authored on both sides.

## References

- `cidr.ts` — `cidrContains`
- `cidrv4.ts` — `cidrv4Contains`; `cidrv6.ts` — `cidrv6Contains`
- ADR 0001 — IPv4 and IPv6 address spaces are disjoint at the type level
- ADR 0004 — `parseIp` / `parseCidr` auto-unwrap IPv4-mapped IPv6
- ADR 0005 — Cross-version CIDR-vs-CIDR operations throw `TypeError`
