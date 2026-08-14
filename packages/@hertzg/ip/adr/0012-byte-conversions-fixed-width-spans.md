# ADR 0012 — Byte conversions operate on a fixed-width span, and never reinterpret the version

**Status:** Accepted

## Context

The `bytes` submodule converts between the numeric address forms of
ADR 0001 and their network-order wire bytes. Its consumers are packet
decoders — `@binstruct/ipv4`, `@binstruct/ipv6`, `@binstruct/arp`,
`@binstruct/icmpv6`, `@binstruct/inet` — which hold a whole frame in
one `Uint8Array` and know the byte offset of each address field.

That shape drives four decisions the rest of the package did not have
to make, because every other entry point takes a self-delimiting string.

**Where the width comes from.** A string carries its own end. A buffer
does not: `ipv4FromBytes(packet, 12)` is a 4-byte read into a 60-byte
frame. The width has to come from the function, not the argument.

**What a wrong width does.** Reading `bytes[offset + 3]` past the end
yields `undefined`, and `undefined | x` coerces to `0`. A truncated
capture silently decodes as `0.0.0.0` — a plausible-looking address
that passes an ACL check.

**How the bytes are moved.** `DataView` gives 32- and 64-bit accessors
plus bounds checking; index arithmetic on the `Uint8Array` gives
neither, but skips the `DataView` allocation.

**Whether an IPv4-mapped 16-byte value is IPv4.** ADR 0004 has the
universal `parseIp` unwrap `::ffff:x.x.x.x` to a `number`. The same
question arises for a 16-byte read.

## Decision

**Fixed width per function; `offset` selects where, never how much.**
`ipv4FromBytes` / `ipv4ToBytes` are always 4 bytes, `ipv6FromBytes` /
`ipv6ToBytes` always 16. `offset` defaults to `0`.

**`ipFromBytes` dispatches on the span width, and the span must be
exactly 4 or 16.** The span is `bytes.length - offset`. A 60-byte frame
at offset 12 is a 48-byte span and throws `RangeError` — it is not
silently read as 16 bytes. Callers who know the version and the offset
use the version-specific function; `ipFromBytes` is for a buffer that
holds one address and nothing else. There is no version parameter: a
function that takes both bytes and a version is `ipv4FromBytes` with
extra steps.

**A short span throws `RangeError`, on both read and write.** This is
not the buffer-capacity checking the repo forbids: the span is a value
domain, checked exactly the way `stringifyIpv4` already checks that its
argument fits in 32 bits. It measures free — see Consequences.

**Index arithmetic, not `DataView`, in all six functions.** The 32-bit
read and write are shared private helpers; the 128-bit functions call
them four times each.

**No version reinterpretation.** `ipFromBytes` on 16 bytes returns a
`bigint` even when those bytes are `::ffff:x.x.x.x`. This is a
deliberate exception to ADR 0004.

**`ipToBytes` and friends always return exactly the written span** — a
fresh `Uint8Array` when `into` is omitted, `into.subarray(offset,
offset + width)` when it is given. Never the whole `into`.

**Byte order is network order (big-endian), with no option.** IP
addresses have exactly one wire order.

## Consequences

- **`DataView`'s cost is its constructor, not its accessors.** On an
  M2 Pro, Deno 2.9.5, per call: IPv4 read 3.9 ns by index vs 50.7 ns
  via `DataView`, IPv4 write 3.8 ns vs 48.2 ns, IPv6 read 37.6 ns vs
  49.9 ns. `DataView` wins one case, the IPv6 write, by 12 % (57.1 ns
  vs 64.5 ns) — not enough to split the idiom across the module.
- **The bounds check is free.** Checked vs unchecked measures inside
  noise: IPv4 read 3.8 ns either way, IPv6 read 38.1 ns checked vs
  40.0 ns unchecked. It buys back the bounds checking `DataView` would
  have given, at a thirteenth of `DataView`'s cost.
- **Do not reach for a naive `bigint` byte loop.** Accumulating 16
  bytes with `(acc << 8n) | BigInt(b)` costs 227 ns to read and 352 ns
  to write. Decomposing into four 32-bit halves keeps `bigint` work to
  four conversions and three shifts.
- **Round-trip preserves width.** `ipToBytes(ipFromBytes(b))` returns
  the same number of bytes it was given. Under ADR 0004's unwrapping
  it would return 4 bytes for a 16-byte input, and a caller assembling
  a frame would lay out a field 12 bytes short.
- **Dual-stack normalization is a separate, explicit step.** A caller
  who wants an `::ffff:` field as IPv4 composes `ipv4From64Mapped`, or
  goes through `parseIp` — the same explicit-conversion path ADR 0004
  and ADR 0005 already point at.
- **`ipFromBytes` is narrower than `ipaddr.js`'s `fromByteArray`.**
  It rejects a span that is neither 4 nor 16 rather than guessing,
  which is the failure mode the issue that prompted this ADR called
  out.
- **The subarray return keeps `.length` meaningful.** `node-ip`'s
  `toBuffer` returns the whole destination buffer, so callers cannot
  tell how much was written without already knowing the version. Here
  `result.length` is the answer.
- **The subarray is a view, not a copy.** Writing through the returned
  value writes into `into`. That is the point, and it is documented.

## References

- `bytes.ts` — `ipv4FromBytes`, `ipv4ToBytes`, `ipv6FromBytes`,
  `ipv6ToBytes`, `ipFromBytes`, `ipToBytes`
- ADR 0001 — IPv4 is `number`, IPv6 is `bigint`; bytes are a
  conversion of those, not a third representation
- ADR 0004 — universal parsers auto-unwrap IPv4-mapped IPv6; the byte
  conversions deliberately do not
- ADR 0005 — cross-version misuse throws rather than answering quietly
- Repo ADR 0010 — sub-entrypoint exports per package
