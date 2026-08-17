# ADR 0004 - Mapped addresses

The universal parsers unmap `::ffff:a.b.c.d` to IPv4 by default. The
versioned parsers never do. Everything else converts only when asked.

```ts
parseAddress("::ffff:1.2.3.4")                        // { address: 16909060 }
parseAddress("::ffff:1.2.3.4", { unmapToV4: false })  // { address: 0xffff01020304n }
parseAddressv6("::ffff:1.2.3.4")                      // { address: 0xffff01020304n }
parseCidr("::ffff:1.2.3.4/120")                       // { address: 16909060, prefixLength: 24 }
parseCidr("::ffff:1.2.3.4/64")                        // stays v6
```

Dual-stack listeners report IPv4 clients in the mapped form, and almost
every caller wants the IPv4 view. So `parseAddress` gives it and the
option turns it off; `parseAddressv6` returning a `number` would make its
own name a lie.

A CIDR unmaps only when the whole `::ffff:0:0/96` prefix is fixed: prefix
length 96 or longer, or a mask whose high 96 bits are all ones. Anything
shorter is an IPv6 block that happens to start in the mapped range, and
narrowing it would lose information. The v4 value is the low 32 bits.

Mapping is an IPv6 concept (RFC 4291 §2.5.5.2), so the explicit
conversions live in the v6 modules: `mapFromAddressv4`,
`unmapToAddressv4`, `mapFromCidrv4`, `unmapToCidrv4`. `addressFromBytes`
on 16 bytes returns a `bigint` even for mapped bytes; comparators order
a mapped `bigint` in the IPv6 half.

Ruled out: unmapping everywhere (a `bigint` is a v6 value; changing that
silently is what ADR 0005 forbids); a separate `unwrapIfMapped` helper
as the only path (pessimises the common case).
