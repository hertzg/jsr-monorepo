# ADR 0009 - Usable addresses and reverse DNS names are narrow

Usable-address helpers exist for IPv4 only. Reverse DNS names exist for
addresses only, and are relative.

```
cidrv4FirstUsableAddress   cidrv4LastUsableAddress
cidrv4UsableSize           cidrv4UsableAddresses      no v6, no universal

addressv4ToArpa(a)  ->  "1.0.168.192.in-addr.arpa"      no trailing dot
addressv6ToArpa(a)  ->  "1.0.0.0. ... .ip6.arpa"        no prefix form
```

IPv4 has a blanket rule for what is not assignable: the network and
broadcast addresses, except at `/31` and `/32` (RFC 1812, RFC 3021).
IPv6 has no broadcast, and its one candidate, the Subnet-Router anycast,
is a per-link reservation, so Python excludes it and Rust does not.
Choosing either would encode a per-link decision as a library rule.
Callers on such a link skip it themselves with `{ offset: 1n }`. Block
bounds (`cidrFirstAddress`, `cidrLastAddress`) carry no policy and stay
universal.

A reverse name is a fixed transform of an address (RFC 1035, RFC 3596).
The prefix form is two things fused (a zone name at a byte or nibble
boundary, and RFC 2317 delegation), and nobody has asked for either. The
name is relative because every stringifier here emits a bare canonical
form; a trailing dot is DNS framing the caller appends.

Ruled out: `cidrv6FirstUsableAddress` as an alias of `cidrv6FirstAddress`;
`cidrUsableAddresses` (its meaning would change with the runtime type);
`arpaToAddress` (nothing here parses DNS names).
