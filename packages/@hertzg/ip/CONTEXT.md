# @hertzg/ip

IPv4 and IPv6 addresses, CIDR blocks, classification, and conversion to
and from wire bytes. The version lives in the primitive type: `number` is
IPv4, `bigint` is IPv6 (ADR 0001). `Ip` names the protocol family
(`IpVersion`), never a value; unsuffixed functions take either version,
`v4` / `v6` take one (ADR 0002).

## Nouns

**Address**: the primitive value of one host. `Addressv4 = number`,
`Addressv6 = bigint`, `Address` is the union. Parameter and field name is
`address`. Avoid `host`, `endpoint`, `ip` as a value name.

**Cidr**: a block of addresses. `{ address, prefixLength }` or
`{ address, mask }`; both dialects are stored as given (ADR 0006).
`Cidrv4`, `Cidrv6`, `Cidr`. Prose says "CIDR block", never "range" or
"subnet". Parameter name is `cidr`; two blocks are `outer` / `inner` or
`a` / `b`.

**Prefix length**: the `24` in `/24`. Spelled `prefixLength`. Bare
"prefix" means the fixed bits, as in the mapped `::ffff:0:0/96` prefix.

**Mask**: the bitmask a prefix length produces, `Maskv4` / `Maskv6`. A
CIDR written as `10.0.0.0/255.0.0.0` stores one.

**Zone ID**: the interface tail after `%`, `zoneId`, a `string`. Present
only on `Parsed*` types; operations do not see it.

**Parsed\***: what `parse*` returns and `stringify*` accepts. `Address`
plus optional `zoneId`, or `Cidr` plus optional `zoneId`. Assignable to
the bare type, so a parse result goes straight into math.

**Order**: the sort the `compare*` family defines. Version-first, then
numeric ascending, then prefix length ascending. Returns `-1 | 0 | 1`.

**Span**: a fixed-width window of bytes, 4 or 16, in a `Uint8Array`.
Readers take `bytes`, a view of exactly the span. Writers take `into` and
a byte `offset` saying where in it to begin. The address `offset` in
`cidr*Addresses` counts addresses into the block; nothing takes both.

## Notation

```
address [ "%" zoneId ] [ "/" prefixLength | mask ]
```

Three slots, this order, each delimiter at most once. `parseAddress*`
rejects the third slot, `parseCidr*` requires it, all accept a zone
(ADR 0003).

## Guards

Parsers reject bad notation. Nothing downstream re-checks; a function
throws only when no answer exists (ADR 0006).
