/**
 * IPv4 datagram encoding and decoding (RFC 791).
 *
 * A datagram is a 20-byte fixed header, a variable-length options trailer
 * (0–40 bytes per `IHL`), and the transport-layer payload:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |Ver/IHL |  ToS   |   Total Length  |
 * +--------+--------+--------+--------+
 * | Identification  |Flags + FragOffs |
 * +--------+--------+--------+--------+
 * |  TTL   |Protocol|  Header Cksum   |
 * +--------+--------+--------+--------+
 * |          Source Address           |
 * +--------+--------+--------+--------+
 * |       Destination Address         |
 * +--------+--------+--------+--------+
 * |       Options (0-40 bytes)        |
 * +-----------------------------------+
 * |        Payload (variable)         |
 * +-----------------------------------+
 * ```
 *
 * Provides a single-pass coder for the full datagram — fixed header, optional
 * options trailer, and the transport payload sized via `totalLength`. Bit-packed
 * fields (version/IHL, flags/fragment offset) are exposed as nested objects via
 * `bitStruct`, keeping the on-wire layout faithful while preserving named-field
 * access.
 *
 * IPv4 addresses are surfaced as raw 32-bit unsigned integers, mirroring how
 * ARP exposes the same field. Use
 * {@link https://jsr.io/@hertzg/ip @hertzg/ip}'s `parseIpv4` / `stringifyIpv4`
 * for human-readable conversion.
 *
 * Design notes:
 *
 * - The header checksum is **not** computed automatically. Callers are expected
 *   to set the `headerChecksum` field to a valid RFC 1071 16-bit one's
 *   complement sum before encoding (or zero when the receiver tolerates it,
 *   e.g. for testing). This matches the `@hertzg/binstruct` "no defensive
 *   programming" stance — the coder describes layout, not semantics.
 * - Options are encoded as a raw byte slice whose length is derived from
 *   `versionIhl.ihl`: `(ihl - 5) * 4`. For a datagram with no options pass
 *   `ihl = 5` and `options = new Uint8Array(0)`.
 * - The payload size is derived from `totalLength - ihl * 4`. Callers are
 *   responsible for setting `totalLength` to match `ihl * 4 + payload.length`.
 *
 * @example Round-trip a minimal IPv4 datagram (no options, empty payload)
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { ipv4FramePayload } from "@binstruct/ipv4";
 *
 * const coder = ipv4FramePayload();
 * const datagram = {
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 20,
 *   identification: 0x1234,
 *   flagsFragmentOffset: {
 *     reserved: 0,
 *     dontFragment: 1,
 *     moreFragments: 0,
 *     fragmentOffset: 0,
 *   },
 *   timeToLive: 64,
 *   protocol: 6,
 *   headerChecksum: 0,
 *   sourceAddress: parseIpv4("192.168.1.100"),
 *   destinationAddress: parseIpv4("10.0.0.50"),
 *   options: new Uint8Array(0),
 *   payload: new Uint8Array(0),
 * };
 *
 * const buffer = new Uint8Array(20);
 * const bytesWritten = coder.encode(datagram, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 20);
 * assertEquals(bytesRead, 20);
 * assertEquals(decoded.sourceAddress, parseIpv4("192.168.1.100"));
 * assertEquals(decoded.destinationAddress, parseIpv4("10.0.0.50"));
 * assertEquals(decoded.flagsFragmentOffset.dontFragment, 1);
 * ```
 *
 * @module
 */

import {
  bitStruct,
  bytes,
  type Coder,
  computedRef,
  ref,
  struct,
  u16be,
  u32be,
  u8be,
} from "@hertzg/binstruct";

/**
 * EtherType assigned to IPv4 (`0x0800`). The value an Ethernet II frame's
 * `etherType` field carries when its payload is an IPv4 datagram.
 */
export const ETHERTYPE_IPV4 = 0x0800;

/**
 * Decoded IPv4 datagram (RFC 791) — header fields, options trailer, and the
 * raw transport-layer payload.
 *
 * IPv4 addresses (`sourceAddress` / `destinationAddress`) are surfaced as
 * 32-bit unsigned integers, the same on-wire form ARP uses. Use
 * `@hertzg/ip/ipv4`'s `parseIpv4` / `stringifyIpv4` for human-readable
 * conversion.
 *
 * The `options` length is derived from `versionIhl.ihl` (`(ihl - 5) * 4`); the
 * `payload` length is derived from `totalLength - versionIhl.ihl * 4`.
 */
export interface Ipv4FramePayload {
  versionIhl: {
    version: number;
    ihl: number;
  };
  typeOfService: number;
  totalLength: number;
  identification: number;
  flagsFragmentOffset: {
    reserved: number;
    dontFragment: number;
    moreFragments: number;
    fragmentOffset: number;
  };
  timeToLive: number;
  protocol: number;
  headerChecksum: number;
  sourceAddress: number;
  destinationAddress: number;
  options: Uint8Array;
  payload: Uint8Array;
}

/**
 * Creates a coder for a complete IPv4 datagram — header, options, and the
 * transport-layer payload sized via the `totalLength` field.
 *
 * Pair this with `refineSwitch` on the `protocol` field (see `@binstruct/inet`)
 * to dispatch the payload into a typed L4 value.
 *
 * @returns A coder for {@link Ipv4FramePayload} values.
 *
 * @example Round-trip a UDP-bearing datagram
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { ipv4FramePayload } from "@binstruct/ipv4";
 *
 * const coder = ipv4FramePayload();
 * const datagram = {
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 24,
 *   identification: 0,
 *   flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *   timeToLive: 64,
 *   protocol: 17,
 *   headerChecksum: 0,
 *   sourceAddress: parseIpv4("192.0.2.1"),
 *   destinationAddress: parseIpv4("192.0.2.2"),
 *   options: new Uint8Array(0),
 *   payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(datagram, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, 24);
 * assertEquals(decoded.totalLength, 24);
 * assertEquals(decoded.payload.length, 4);
 * ```
 */
export function ipv4FramePayload(): Coder<Ipv4FramePayload> {
  const versionIhl = bitStruct({
    version: 4,
    ihl: 4,
  });

  const totalLength = u16be();

  return struct({
    versionIhl,
    typeOfService: u8be(),
    totalLength,
    identification: u16be(),
    flagsFragmentOffset: bitStruct({
      reserved: 1,
      dontFragment: 1,
      moreFragments: 1,
      fragmentOffset: 13,
    }),
    timeToLive: u8be(),
    protocol: u8be(),
    headerChecksum: u16be(),
    sourceAddress: u32be(),
    destinationAddress: u32be(),
    options: bytes(computedRef([ref(versionIhl)], (vi) => (vi.ihl - 5) * 4)),
    payload: bytes(
      computedRef(
        [ref(totalLength), ref(versionIhl)],
        (total, vi) => total - vi.ihl * 4,
      ),
    ),
  });
}
