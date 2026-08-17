# ADR 0008 - Bytes are fixed width

A byte span is 4 or 16 bytes, network order, and its width comes from
the function or the value, never from the buffer around it. Readers take
exact bytes and no offset. Only writers take a target buffer and offset.

```ts
addressv4FromBytes(packet.subarray(12, 16))  // exactly 4 bytes, else RangeError
addressv6FromBytes(packet.subarray(8, 24))   // exactly 16 bytes, else RangeError
addressFromBytes(bytes)                      // length 4 or 16 picks the version
addressToBytes(address, into, offset)        // width from typeof address
                                             // returns into.subarray(offset, offset + width)
```

The consumers are packet decoders holding a whole frame. A buffer does
not carry its own end, so a reader given a frame plus an offset would
have to guess where the field stops, and `undefined | x` past the end
decodes a truncated capture as `0.0.0.0` that passes an ACL. So the
caller does the homework and passes a view of the field; the reader
checks the length and nothing else. A writer is different: the caller
already owns the destination and its size, so `offset` only says where
in it to begin, and the width is fixed by the value being written.

Sixteen bytes always come back as a `bigint`, mapped or not; unmapping is
a parse-time option (ADR 0004), not a byte-level guess. Writers return
exactly the span they wrote, as a view, so `.length` means something.

Ruled out: an `offset` on readers (the width would then depend on what
trails the field, so the same 4 bytes read as v4 in a 20-byte frame and
v6 in a 28-byte one); a version parameter (that is `addressv4FromBytes`
with extra steps); `DataView` (measured up to 12x slower on the 4-byte
read, wins nothing elsewhere); returning the whole destination buffer.
