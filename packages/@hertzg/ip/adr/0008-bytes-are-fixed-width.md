# ADR 0008 - Bytes are fixed width

A byte span is 4 or 16 bytes, network order, and its width comes from
the function or the value, never from the buffer around it.

```ts
addressv4FromBytes(packet, 12)      // always 4 bytes at offset 12
addressv6FromBytes(packet, 8)       // always 16 bytes at offset 8
addressFromBytes(bytes)             // bytes.length must be 4 or 16; no offset
addressToBytes(address, into, off)  // width from typeof address; returns the written subarray
```

The consumers are packet decoders holding a whole frame. A buffer does
not carry its own end, so `undefined | x` past the end would decode a
truncated capture as `0.0.0.0` and pass an ACL. So a short span throws
`RangeError` on read and on write, and the universal reader takes no
offset: with one, the same 4-byte field would read as v4 in a 20-byte
frame and as v6 in a 28-byte one.

Sixteen bytes always come back as a `bigint`, mapped or not; unmapping is
a parse-time option (ADR 0004), not a byte-level guess. Writers return
exactly the span they wrote, as a view, so `.length` means something.

Ruled out: `DataView` (measured up to 12x slower on the 4-byte read, wins
nothing elsewhere); a version parameter (that is `addressv4FromBytes`
with extra steps); returning the whole destination buffer.
