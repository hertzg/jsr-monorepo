/**
 * Linux cooked capture v1 (`DLT_LINUX_SLL`) header encoding and decoding.
 *
 * `SLL` ("Simple Linux Layer to describe the format") is the pseudo link
 * layer libpcap synthesizes when a capture is taken on a Linux "any" device,
 * or on an interface whose real link layer doesn't fit an Ethernet-shaped
 * header (PPP, tunnels, `nlmon`, ...). It replaces the real link-layer
 * header with a fixed 16-byte header, followed by the payload as understood
 * by `protocol`:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |  Packet Type    |  ARPHRD Type    |
 * +--------+--------+--------+--------+
 * |  Addr Length    |  Link-Layer     |
 * +-----------------+  Address        |
 * |         Address (cont.)           |
 * +-----------------+-----------------+
 * |  Addr (cont.)   |    Protocol     |
 * +-----------------+-----------------+
 * |            Payload (variable)     |
 * +-----------------------------------+
 * ```
 *
 * `linkLayerAddress` is always 8 bytes on the wire regardless of the actual
 * address length — only the first `linkLayerAddressLength` bytes are
 * meaningful, the rest is padding. This coder surfaces the field verbatim
 * (all 8 bytes); trim it with `linkLayerAddress.subarray(0,
 * linkLayerAddressLength)` if you only want the meaningful prefix.
 *
 * `arphrdType` is a Linux `ARPHRD_*` constant (`include/uapi/linux/if_arp.h`)
 * identifying the real link layer of the captured interface, and `protocol`
 * is an EtherType-space value (the same numbering Ethernet II uses)
 * identifying the payload, e.g. `0x0800` for IPv4.
 *
 * See the tcpdump link-layer header type registry for the authoritative
 * layout: {@link https://www.tcpdump.org/linktypes/LINKTYPE_LINUX_SLL.html}.
 *
 * Scope for `0.0.1`: the 16-byte header only, shallow and sane. No
 * deep-parsing of `payload` by `protocol`, no v2 (`DLT_LINUX_SLL2`) support.
 *
 * @example Round-trip an IPv4-carrying SLL header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { sllHeader, SLL_PACKET_TYPE } from "@binstruct/sll";
 *
 * const coder = sllHeader();
 * const frame = {
 *   packetType: SLL_PACKET_TYPE.HOST,
 *   arphrdType: 1,
 *   linkLayerAddressLength: 6,
 *   linkLayerAddress: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x00, 0x00]),
 *   protocol: 0x0800,
 *   payload: new Uint8Array([0x45, 0x00, 0x00, 0x14]),
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(frame, buffer);
 * const [decoded, read] = coder.decode(buffer.subarray(0, written));
 *
 * assertEquals(written, read);
 * assertEquals(decoded.packetType, SLL_PACKET_TYPE.HOST);
 * assertEquals(decoded.protocol, 0x0800);
 * assertEquals(decoded.payload, frame.payload);
 * ```
 *
 * @module @binstruct/sll
 */

import { bytes, type Coder, struct, u16be } from "@hertzg/binstruct";

/**
 * Size in bytes of the fixed `SLL` header (packet type, ARPHRD type, address
 * length, 8-byte address slot, protocol). Everything after this offset is
 * `payload`.
 */
export const SLL_HEADER_SIZE = 16;

/**
 * `packetType` values — how the packet relates to the capturing host,
 * mirroring the `PACKET_*` values Linux reports via `sockaddr_ll`.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { SLL_PACKET_TYPE } from "@binstruct/sll";
 *
 * assertEquals(SLL_PACKET_TYPE.HOST, 0);
 * assertEquals(SLL_PACKET_TYPE.OUTGOING, 4);
 * ```
 */
export const SLL_PACKET_TYPE = {
  /** Packet addressed to the capturing host. */
  HOST: 0,
  /** Physical-layer broadcast packet. */
  BROADCAST: 1,
  /** Packet sent to a physical-layer multicast address. */
  MULTICAST: 2,
  /** Packet addressed to another host, seen because the interface is promiscuous. */
  OTHER_HOST: 3,
  /** Packet sent by the capturing host. */
  OUTGOING: 4,
} as const;

/**
 * Decoded Linux cooked capture (`SLL` v1) header.
 *
 * @property packetType             - How the packet relates to the capturing host. See {@linkcode SLL_PACKET_TYPE}.
 * @property arphrdType             - Linux `ARPHRD_*` constant identifying the real link layer of the captured interface.
 * @property linkLayerAddressLength - Number of meaningful bytes at the start of `linkLayerAddress` (0–8).
 * @property linkLayerAddress       - Link-layer address slot, always 8 bytes on the wire; only the first `linkLayerAddressLength` bytes are meaningful.
 * @property protocol               - EtherType-space value identifying the payload, e.g. `0x0800` for IPv4.
 * @property payload                - Everything after the 16-byte header.
 */
export interface SllHeader {
  packetType: number;
  arphrdType: number;
  linkLayerAddressLength: number;
  linkLayerAddress: Uint8Array;
  protocol: number;
  payload: Uint8Array;
}

/**
 * Creates a coder for a Linux cooked capture v1 (`DLT_LINUX_SLL`) header.
 *
 * Layout: `packetType` (u16be), `arphrdType` (u16be), `linkLayerAddressLength`
 * (u16be), `linkLayerAddress` (fixed 8 bytes), `protocol` (u16be), then
 * `payload` as the rest of the buffer.
 *
 * Nothing is validated or derived on encode — `linkLayerAddressLength` and
 * the padding within `linkLayerAddress` are written exactly as given.
 *
 * @returns A coder for {@linkcode SllHeader} values.
 *
 * @example Decode a known-wire ARP-carrying header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { sllHeader, SLL_HEADER_SIZE, SLL_PACKET_TYPE } from "@binstruct/sll";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x00, 0x00,                         // packetType: HOST
 *   0x00, 0x01,                         // arphrdType: ARPHRD_ETHER
 *   0x00, 0x06,                         // linkLayerAddressLength: 6
 *   0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x00, 0x00, // linkLayerAddress (8 bytes)
 *   0x08, 0x06,                         // protocol: ARP
 *   0x00, 0x01, 0x08, 0x00,             // payload
 * ]);
 *
 * const [decoded, read] = sllHeader().decode(wire);
 *
 * assertEquals(read, wire.length);
 * assertEquals(decoded.packetType, SLL_PACKET_TYPE.HOST);
 * assertEquals(decoded.arphrdType, 1);
 * assertEquals(decoded.linkLayerAddressLength, 6);
 * assertEquals(decoded.protocol, 0x0806);
 * assertEquals(decoded.payload.length, wire.length - SLL_HEADER_SIZE);
 * ```
 */
export function sllHeader(): Coder<SllHeader> {
  return struct({
    packetType: u16be(),
    arphrdType: u16be(),
    linkLayerAddressLength: u16be(),
    linkLayerAddress: bytes(8),
    protocol: u16be(),
    payload: bytes(),
  });
}
