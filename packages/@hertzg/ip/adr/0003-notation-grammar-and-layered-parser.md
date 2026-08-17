# ADR 0003 - Notation grammar and the layered parser

One grammar, three slots, fixed order. Every parser is a narrowing of it.

```
notation = address [ "%" zoneId ] [ "/" prefix ]

192.168.1.1   fe80::1%eth0   10.0.0.0/8   fe80::%ether1/64   10.0.0.0/255.0.0.0
```

The order is normative (RFC 4007 §11.7): zone before prefix, so the
prefix is always the trailing `/...`. `%` and `/` each occur at most once,
because no slot may contain either. That is what lets layer 1 know
nothing about IP.

**Layer 1, structural.** One pass records the position of `%` and `/`,
then slices. It rejects exactly five things: two `%`, two `/`, `%` after
`/`, an empty address, an empty zone or prefix. `fe80::1%eth0%1`,
`10.0.0.0/8%eth0` and `fe80::1%` all end here. Zone greediness cannot
happen: the zone slice is bounded by the slash.

**Layer 2, fields.** Four scanners, each total over its own slice.

- Address: dispatch on `:` (not `.`, since `::ffff:1.2.3.4` has both).
  Exactly the RFC grammar: v4 is four decimal octets, no leading zero,
  0..255; v6 is `1*4HEXDIG` groups, one `::` covering one or more groups,
  at most eight groups, a dotted quad only as the final field. No sign,
  no `0x`, no whitespace, no trailing text.
- Zone: no whitespace. Everything else verbatim, `@` included (RouterOS
  emits `%sfp-sfpplus2@myVrf`). Never percent-decoded; `%25eth0` is the
  zone `25eth0`.
- Prefix: contains `.` or `:` means a mask, scanned as an address;
  otherwise a decimal.
- Decimal: digits, no leading zero, no sign. No range check here; the
  bound depends on the address version.

**Layer 3, semantic.** Six rules, in order.

1. Slot ownership: `parseAddress*` rejects a prefix, `parseCidr*` requires one; all accept a zone.
2. Version ownership: `*v4` requires a v4 address, `*v6` a v6 one.
3. Version agreement: a mask must match the address version. `10.0.0.0/ffff:ff00::` is rejected here and nowhere else.
4. Prefix length range: 0..32 or 0..128. A mask is not range-checked and need not be contiguous (ADR 0006).
5. `unmapToV4` on the universal parsers, default on: see ADR 0004.
6. Zone attached verbatim; it never touches the numeric value.

Errors: wrong shape is `TypeError`, right shape with a number too large
is `RangeError`. A signed field is a shape error, so `-0` cannot leak.

Ruled out: trimming input (node, ipaddr.js and ip-address all reject
surrounding whitespace); validating with a regex then parsing (measured
+18% on the hot path, and the scan validates each character for free);
percent-decoding zones (`%25` is also Windows interface index 25);
`/` inside a zone as `draft-ietf-netmod-rfc6991-bis` allows (nothing
emits it, and excluding it is what makes the prefix unambiguous).
