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

**A short span throws `RangeError`, on both read and write.** The two
halves stand on different ground, and it is worth being straight about
which.

On the **read** side this is not an exception to repo ADR 0006 at all.
That ADR already carves out "boundary errors (network, parsing
untrusted bytes)" as real failures rather than type assertions, and a
buffer arriving off a wire is exactly that.

On the **write** side it *is* in tension with the same ADR, which lists
"callers are responsible for buffer sizes" as a consequence. The check
stays anyway, for two reasons. A partial write into a caller's frame
corrupts a buffer they still hold, which is worse than a bad return
value they can inspect. And symmetry matters more than the rule here:
a module where the read validates and the write does not is a module
whose contract nobody can remember. It measures free — see
Consequences.

**Both v4 and v6 functions live in one module, against ADR 0002's
`<concern>[v4|v6]` grouping.** That grouping exists for tree-shaking,
and there is nothing here to shake: `ipv4FromBytes` is two lines and
`ipv6FromBytes` is five, against the ~27 KB each that justifies
splitting `cidrv4.ts` from `cidrv6.ts`. Splitting would also strand the
private `readUint32` / `writeUint32` helpers, which both versions
share and which the package has no private-module convention to hold.
`4to6.ts` is the standing precedent for a cross-version concern in one
file. The naming convention that callers actually read — the
`Ip` / `Ipv4` / `Ipv6` qualifier — is followed exactly.

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

- **`DataView`'s cost is its constructor, not its accessors.** From a
  throwaway `deno bench` run while deciding this, not a committed
  benchmark; re-measure before leaning on the exact figures. On an
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
- **The view is the dominant cost of the in-place write, and callers
  cannot opt out.** Writing four bytes into an existing frame costs
  ~25 ns, of which ~24 ns is the `subarray`; the write alone is
  ~1.4 ns. V8 does not elide it even when the call site discards the
  result, which is the common packet-encoder shape. That is the price
  of `result.length` meaning something. If a consumer ever needs the
  bytes-written path without it, add a separate void-returning entry
  point rather than making the return type conditional.

## References

- `bytes.ts` — `ipv4FromBytes`, `ipv4ToBytes`, `ipv6FromBytes`,
  `ipv6ToBytes`, `ipFromBytes`, `ipToBytes`
- ADR 0001 — IPv4 is `number`, IPv6 is `bigint`; bytes are a
  conversion of those, not a third representation
- ADR 0004 — universal parsers auto-unwrap IPv4-mapped IPv6; the byte
  conversions deliberately do not
- ADR 0002 — `<concern>[v4|v6]` submodule grouping, which this module
  deliberately collapses into one file
- ADR 0005 — cross-version misuse throws rather than answering quietly
- Repo ADR 0006 — no defensive programming; its boundary-error carve-out
  covers the read side, and the write-side check is argued above
- Repo ADR 0010 — sub-entrypoint exports per package
