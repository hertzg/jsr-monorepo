# @hertzg/ip

IPv4 and IPv6 address parsing, stringifying, classification, and CIDR utilities.
The value-level vocabulary is shared across both protocol versions; the version
is encoded in the JS primitive type (`number` for IPv4, `bigint` for IPv6 — see
ADR 0001).

## Language

**Address**: The primitive value of an IP host — a `number` for IPv4, a `bigint`
for IPv6. The same noun applies to both versions; the version is read from the
type. Exported as the type alias `Address` from the package root and re-exported
from the submodules whose signatures use it; prefer it over spelling the union
inline, but only where the value _is_ an address — counts and strides
(`cidrSize`, `offset`, `count`, `step`) keep the plain `number | bigint`. The
corresponding string form is the "address string" (or "dotted decimal" /
"colon-hexadecimal" when the format matters). _Avoid_: `host`, `endpoint`. In
parameter names, JSDoc, and prose, use `address`. "IP address" is acceptable in
prose when the protocol context isn't already obvious. In function names, the
version qualifier (`Ip` / `Ipv4` / `Ipv6`) is what disambiguates — see below.

**AddressOrCidr**: The union of `Address` and `Cidr` — everything the universal
`parse` and `stringify` accept and return. Exported as a type alias from the
`cidr` submodule and the package root. The union has no short noun of its own,
so parameters holding one keep a role name: `notation` for the string form,
`value` for the parsed form. _Avoid_: `addressOrCidr`, `input`.

**CIDR**: A block of addresses defined by a starting address and a prefix
length. The parsed object form is `{ address, prefixLength }`, exported as
`Cidrv4` (`number` address), `Cidrv6` (`bigint` address), and their union
`Cidr`; the version is read from the address type as everywhere else (see
ADR 0003). The noun phrase is "CIDR block" — a block always holds a
power-of-two count of addresses, aligned to its own size. The corresponding
string form is the "CIDR notation" (`"192.168.1.0/24"`), the same split the
**Address** entry makes for "address string". _Avoid_: `subnet`, `supernet`,
`net`, and "CIDR range" — a range is any start-to-end span, which this package
has no type for. That distinction is load-bearing: `cidrSubtract` and
`cidrMerge` return arrays because their result is a range, and a range only
expresses as several blocks. "Range" stays correct in the looser classification
sense ("well-known range"), where one category spans several blocks. `network`
is not a synonym either — it names the first address of a block
(`cidrv4NetworkAddress`) and the mask that produces it (`cidrv4Mask`). In
parameter names, JSDoc, and prose, use `cidr` for both forms —
`parseCidr(cidr: string)` and `stringifyCidr(cidr: Cidr)` — exactly as
`address` covers both forms of an address. Where a signature takes two blocks
the role name carries the meaning instead: `outer` / `inner` for containment,
`a` / `b` for symmetric operations, `cidrs` for a collection.

**Prefix length**: The count of leading bits a CIDR fixes — the `24` in
`192.168.1.0/24`. Spelled `prefixLength` as a field and as a parameter, "prefix
length" in prose. _Avoid_: `prefix`, `length`, `bits`. Bare "prefix" names the
fixed bits themselves rather than their count, and is reserved for that (the
`::ffff:0:0/96` well-known prefix in `4to6.ts`); the bitmask derived from a
prefix length is the "network mask", returned by `cidrv4Mask` / `cidrv6Mask`. A
parameter accepting either a whole CIDR or a bare prefix length keeps the union
role name `cidrOrPrefixLength`, following **AddressOrCidr**.

**Order**: The sort order this package defines over addresses and CIDR blocks,
produced by the `compare*` family. It is _version-first_: every IPv4 value sorts
before every IPv6 value, and within a version values sort numerically ascending
(CIDR blocks tie-breaking on prefix length ascending, so the supernet precedes
its subnets). "Version-first" is a claim about order only — the two address
spaces stay disjoint and nothing is converted between them, so `compareIp` never
throws where the operations of ADR 0005 do. See ADR 0011. The functions are
named verb-first (`compareIp`, `compareCidr`) like `parseCidr` and
`stringifyCidr`, not noun-first like `cidrOverlaps`, because the name is
normally read as a value handed to `sort`. _Avoid_: `sortIp`, `ipCompare`,
`cidrCompare`, and "rank". The return value is spelled `-1 | 0 | 1` and carries
no magnitude.

## Function-name convention

Function names use one of three version qualifiers; **the qualifier is not a
synonym for "address" — it selects which protocol versions the function
handles:**

- **`Ip`** — auto-detect either version. `parseIp`, `stringifyIp`, `isValidIp`
  accept v4 or v6 input and dispatch internally to the version-specific
  implementation.
- **`Ipv4`** — IPv4 only. `parseIpv4`, `isIpv4Private`, `Cidrv4`.
- **`Ipv6`** — IPv6 only. `parseIpv6`, `isIpv6Loopback`, `Cidrv6`.

Inside the function body, the value being operated on is still an `address` (the
parameter is named `address`, the field is `address`). "`Ip`" never appears as a
parameter or field name.
