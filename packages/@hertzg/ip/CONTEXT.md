# @hertzg/ip

IPv4 and IPv6 address parsing, stringifying, classification, and CIDR utilities.
The value-level vocabulary is shared across both protocol versions; the version
is encoded in the JS primitive type (`number` for IPv4, `bigint` for IPv6 — see
ADR 0001).

## Language

**Address**: The primitive value of an IP host — a `number` for IPv4, a `bigint`
for IPv6. The same noun applies to both versions; the version is read from the
type. The corresponding string form is the "address string" (or "dotted decimal"
/ "colon-hexadecimal" when the format matters). _Avoid_: `host`, `endpoint`. In
parameter names, JSDoc, and prose, use `address`. "IP address" is acceptable in
prose when the protocol context isn't already obvious. In function names, the
version qualifier (`Ip` / `Ipv4` / `Ipv6`) is what disambiguates — see below.

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
