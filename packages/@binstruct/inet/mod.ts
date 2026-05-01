/**
 * Inet stack coder for the `@binstruct/*` packet family.
 *
 * {@linkcode inetCoder} produces a single round-trippable
 * {@link https://jsr.io/@hertzg/binstruct Coder} that walks an Ethernet II
 * frame top-down using the family's own coders. Each layer's payload field is
 * replaced with a discriminated union of the next layer's decoded form;
 * layers we don't have a coder for default to a raw {@linkcode Uint8Array},
 * so this coder is safe to point at arbitrary captured traffic.
 *
 * Coverage as of 0.1:
 *
 * - L2 — Ethernet II ({@link https://jsr.io/@binstruct/ethernet @binstruct/ethernet})
 * - L3 — IPv4 ({@link https://jsr.io/@binstruct/ipv4 @binstruct/ipv4}),
 *   ARP ({@link https://jsr.io/@binstruct/arp @binstruct/arp})
 * - L4 (under IPv4) — UDP ({@link https://jsr.io/@binstruct/udp @binstruct/udp}),
 *   ICMPv4 ({@link https://jsr.io/@binstruct/icmp @binstruct/icmp})
 *
 * Adding TCP, IPv6, or other link types is one more switch arm each.
 *
 * Also exports {@linkcode internetChecksum} (RFC 1071) — the 16-bit one's
 * complement sum used by IPv4, ICMPv4, UDP, and TCP.
 *
 * @example Round-trip a UDP-over-IPv4-over-Ethernet frame
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { inetCoder } from "@binstruct/inet";
 *
 * const coder = inetCoder();
 *
 * const value = {
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x0800,
 *   payload: {
 *     kind: "ipv4" as const,
 *     ipv4: {
 *       versionIhl: { version: 4, ihl: 5 },
 *       typeOfService: 0,
 *       totalLength: 32,
 *       identification: 0,
 *       flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *       timeToLive: 64,
 *       protocol: 17,
 *       headerChecksum: 0,
 *       sourceAddress: "192.0.2.1",
 *       destinationAddress: "192.0.2.2",
 *       options: new Uint8Array(0),
 *       payload: {
 *         kind: "udp" as const,
 *         udp: {
 *           srcPort: 53,
 *           dstPort: 49152,
 *           length: 12,
 *           checksum: 0,
 *           payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *         },
 *       },
 *     },
 *   },
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(value, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assert(!(decoded.payload instanceof Uint8Array));
 * assert(decoded.payload.kind === "ipv4");
 * assert(!(decoded.payload.ipv4.payload instanceof Uint8Array));
 * assert(decoded.payload.ipv4.payload.kind === "udp");
 * assertEquals(decoded.payload.ipv4.payload.udp.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * ```
 *
 * @module
 */

import { type Coder, refine } from "@hertzg/binstruct";
import {
  type Ethernet2Frame,
  ethernet2Frame,
} from "@binstruct/ethernet";
import {
  type ArpEthernetIpv4Packet,
  arpEthernetIpv4,
} from "@binstruct/arp";
import { type Ipv4Header, ipv4Header } from "@binstruct/ipv4";
import { type IcmpPacket, icmpHeader } from "@binstruct/icmp";
import { type UdpDatagram, udpDatagram } from "@binstruct/udp";

/** EtherType for IPv4. */
export const ETHERTYPE_IPV4 = 0x0800;

/** EtherType for ARP. */
export const ETHERTYPE_ARP = 0x0806;

/** IPv4 protocol number for ICMP. */
export const IP_PROTOCOL_ICMP = 1;

/** IPv4 protocol number for UDP. */
export const IP_PROTOCOL_UDP = 17;

/**
 * Decoded transport-layer payload of an IPv4 datagram.
 *
 * `kind` discriminates the typed branches; an unknown protocol surfaces as
 * the raw {@link Uint8Array} payload for the caller to dispatch further.
 */
export type L4Payload =
  | { readonly kind: "udp"; readonly udp: UdpDatagram }
  | { readonly kind: "icmp"; readonly icmp: IcmpPacket }
  | Uint8Array;

/**
 * Decoded IPv4 datagram: header fields plus a structured `payload` for the
 * carried L4 protocol.
 */
export type Ipv4Decoded = Ipv4Header & {
  readonly payload: L4Payload;
};

/**
 * Decoded network-layer payload of an Ethernet II frame.
 *
 * `kind` discriminates the typed branches; an unknown EtherType surfaces as
 * the raw {@link Uint8Array} payload.
 */
export type EthernetPayload =
  | { readonly kind: "ipv4"; readonly ipv4: Ipv4Decoded }
  | { readonly kind: "arp"; readonly arp: ArpEthernetIpv4Packet }
  | Uint8Array;

/**
 * Decoded Ethernet II frame: same fields as
 * {@link https://jsr.io/@binstruct/ethernet Ethernet2Frame}, but `payload` is
 * the structured {@linkcode EthernetPayload} instead of raw bytes.
 */
export type FrameDecoded = Omit<Ethernet2Frame, "payload"> & {
  readonly payload: EthernetPayload;
};

function decodeL4(protocol: number, bytes: Uint8Array): L4Payload {
  switch (protocol) {
    case IP_PROTOCOL_UDP:
      return { kind: "udp", udp: udpDatagram().decode(bytes)[0] };
    case IP_PROTOCOL_ICMP:
      return { kind: "icmp", icmp: icmpHeader().decode(bytes)[0] };
    default:
      return bytes;
  }
}

function encodeL4(payload: L4Payload): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  switch (payload.kind) {
    case "udp": {
      // UDP's `length` field carries header + payload size in octets.
      const buf = new Uint8Array(payload.udp.length);
      udpDatagram().encode(payload.udp, buf);
      return buf;
    }
    case "icmp": {
      // ICMP is a fixed 8-byte header + variable payload.
      const buf = new Uint8Array(8 + payload.icmp.payload.length);
      icmpHeader().encode(payload.icmp, buf);
      return buf;
    }
  }
}

function decodeL3(etherType: number, bytes: Uint8Array): EthernetPayload {
  switch (etherType) {
    case ETHERTYPE_IPV4: {
      const [header, headerBytes] = ipv4Header().decode(bytes);
      const l4Bytes = bytes.subarray(headerBytes, header.totalLength);
      return {
        kind: "ipv4",
        ipv4: { ...header, payload: decodeL4(header.protocol, l4Bytes) },
      };
    }
    case ETHERTYPE_ARP:
      return { kind: "arp", arp: arpEthernetIpv4().decode(bytes)[0] };
    default:
      return bytes;
  }
}

function encodeL3(payload: EthernetPayload): Uint8Array {
  if (payload instanceof Uint8Array) return payload;
  switch (payload.kind) {
    case "ipv4": {
      const { payload: l4, ...header } = payload.ipv4;
      const l4Bytes = encodeL4(l4);
      const headerSize = header.versionIhl.ihl * 4;
      const buf = new Uint8Array(headerSize + l4Bytes.length);
      ipv4Header().encode(header, buf);
      buf.set(l4Bytes, headerSize);
      return buf;
    }
    case "arp": {
      // Ethernet/IPv4 ARP is fixed 28 bytes.
      const buf = new Uint8Array(28);
      arpEthernetIpv4().encode(payload.arp, buf);
      return buf;
    }
  }
}

const inetFactory = refine(ethernet2Frame(), {
  refine: (frame: Ethernet2Frame): FrameDecoded => ({
    ...frame,
    payload: decodeL3(frame.etherType, frame.payload),
  }),
  unrefine: (decoded: FrameDecoded): Ethernet2Frame => ({
    ...decoded,
    payload: encodeL3(decoded.payload),
  }),
});

/**
 * Creates a coder for an Ethernet II frame whose payload is recursively
 * unpacked into typed network/transport-layer values.
 *
 * The shape mirrors physical layout: each layer's `payload` field is the
 * decoded next layer (a discriminated union) rather than raw bytes. Layers
 * the family doesn't have a coder for default to {@link Uint8Array}, so this
 * coder is safe to point at arbitrary captured traffic.
 *
 * @returns A `Coder<FrameDecoded>` that round-trips Ethernet II bytes through
 *   the structured representation.
 *
 * @example IPv4 + ICMP echo
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { inetCoder } from "@binstruct/inet";
 *
 * const coder = inetCoder();
 * const value = {
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x0800,
 *   payload: {
 *     kind: "ipv4" as const,
 *     ipv4: {
 *       versionIhl: { version: 4, ihl: 5 },
 *       typeOfService: 0,
 *       totalLength: 28,
 *       identification: 0,
 *       flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *       timeToLive: 64,
 *       protocol: 1,
 *       headerChecksum: 0,
 *       sourceAddress: "10.0.0.1",
 *       destinationAddress: "10.0.0.2",
 *       options: new Uint8Array(0),
 *       payload: {
 *         kind: "icmp" as const,
 *         icmp: {
 *           type: 8,
 *           code: 0,
 *           checksum: 0,
 *           restOfHeader: new Uint8Array([0, 1, 0, 1]),
 *           payload: new Uint8Array(0),
 *         },
 *       },
 *     },
 *   },
 * };
 *
 * const buffer = new Uint8Array(64);
 * const written = coder.encode(value, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assert(!(decoded.payload instanceof Uint8Array));
 * assert(decoded.payload.kind === "ipv4");
 * assert(!(decoded.payload.ipv4.payload instanceof Uint8Array));
 * assert(decoded.payload.ipv4.payload.kind === "icmp");
 * assertEquals(decoded.payload.ipv4.payload.icmp.type, 8);
 * ```
 *
 * @example Unknown EtherType surfaces as a raw `Uint8Array`
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { inetCoder } from "@binstruct/inet";
 *
 * const coder = inetCoder();
 * const value = {
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x88cc, // LLDP — no coder for it in the family yet.
 *   payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
 * };
 *
 * const buffer = new Uint8Array(32);
 * const written = coder.encode(value, buffer);
 * const [decoded] = coder.decode(buffer.subarray(0, written));
 *
 * assert(decoded.payload instanceof Uint8Array);
 * assertEquals(decoded.payload, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
 * ```
 */
export function inetCoder(): Coder<FrameDecoded> {
  return inetFactory();
}

/**
 * Computes the 16-bit Internet checksum (RFC 1071) over a span of bytes.
 *
 * The checksum is the 16-bit one's complement of the one's complement sum of
 * all 16-bit words in the span. If the byte length is odd, the trailing byte
 * is padded with zero for the purposes of the sum.
 *
 * Callers typically zero out the checksum field of a header before computing,
 * then write the returned value back into that field. A subsequent call over
 * the completed packet returns 0, the standard receiver-side verification.
 *
 * The function is layout-agnostic — it operates on whatever bytes are passed
 * in. For protocols that include a pseudo-header in the checksum (UDP, TCP),
 * the caller is responsible for assembling the pseudo-header followed by the
 * datagram and passing the concatenation.
 *
 * @param data Bytes to checksum.
 * @returns A 16-bit unsigned integer suitable for direct assignment into a
 *   `u16be` field.
 *
 * @example RFC 1071 §3 worked example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@binstruct/inet";
 *
 * // deno-fmt-ignore
 * const sample = new Uint8Array([
 *   0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7,
 * ]);
 * assertEquals(internetChecksum(sample), 0x220d);
 * ```
 *
 * @example Verify a checksummed packet round-trips to zero
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@binstruct/inet";
 *
 * // deno-fmt-ignore
 * const echoRequest = new Uint8Array([
 *   0x08, 0x00, 0xf7, 0xfd, 0x00, 0x01, 0x00, 0x01,
 * ]);
 * assertEquals(internetChecksum(echoRequest), 0x0000);
 * ```
 */
export function internetChecksum(data: Uint8Array): number {
  let sum = 0;
  const limit = data.length & ~1;
  for (let i = 0; i < limit; i += 2) {
    sum += (data[i] << 8) | data[i + 1];
  }
  if (data.length & 1) {
    sum += data[data.length - 1] << 8;
  }
  while (sum >>> 16) {
    sum = (sum & 0xffff) + (sum >>> 16);
  }
  return (~sum) & 0xffff;
}
