/**
 * Internet protocol primitives and stack orchestration shared across the
 * `@binstruct/*` packet coder family.
 *
 * Two responsibilities:
 *
 * - **Primitives**: small, cross-cutting helpers that more than one
 *   `@binstruct/*` coder needs. The first one is {@linkcode internetChecksum} —
 *   the RFC 1071 16-bit one's complement sum used by IPv4, ICMPv4, UDP, and TCP.
 * - **Stack orchestration**: {@linkcode decodeFrame} walks an Ethernet II frame
 *   top-down, decoding each layer with the matching `@binstruct/*` coder so
 *   callers don't have to thread payloads by hand. Layers we don't have a
 *   coder for surface as `{ kind: "unsupported", ... }` rather than throwing,
 *   which keeps the function safe to point at arbitrary captured traffic.
 *
 * The orchestrator deliberately covers only what the family already ships
 * coders for: Ethernet → (IPv4 | ARP) → (UDP | ICMP | bytes). Adding TCP, IPv6,
 * or other link types is a matter of one more switch arm each.
 *
 * @example Walk a captured Ethernet frame down to its UDP payload
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeFrame } from "@hertzg/inet";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 * import { ipv4Header } from "@binstruct/ipv4";
 * import { udpDatagram } from "@binstruct/udp";
 *
 * // Build a UDP-over-IPv4-over-Ethernet frame.
 * const datagram = new Uint8Array(12);
 * udpDatagram().encode({
 *   srcPort: 53, dstPort: 49152, length: 12, checksum: 0,
 *   payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 * }, datagram);
 *
 * const packet = new Uint8Array(20 + 12);
 * ipv4Header().encode({
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 32,
 *   identification: 0,
 *   flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *   timeToLive: 64,
 *   protocol: 17,
 *   headerChecksum: 0,
 *   sourceAddress: "192.0.2.1",
 *   destinationAddress: "192.0.2.2",
 *   options: new Uint8Array(0),
 * }, packet);
 * packet.set(datagram, 20);
 *
 * const frame = new Uint8Array(14 + 32);
 * ethernet2Frame().encode({
 *   dstMac: new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]),
 *   srcMac: new Uint8Array([0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb]),
 *   etherType: 0x0800,
 *   payload: packet,
 * }, frame);
 *
 * const parsed = decodeFrame(frame);
 *
 * assertEquals(parsed.l3.kind, "ipv4");
 * if (parsed.l3.kind === "ipv4") {
 *   assertEquals(parsed.l3.header.sourceAddress, "192.0.2.1");
 *   assertEquals(parsed.l3.l4.kind, "udp");
 *   if (parsed.l3.l4.kind === "udp") {
 *     assertEquals(parsed.l3.l4.datagram.srcPort, 53);
 *     assertEquals(parsed.l3.l4.datagram.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 *   }
 * }
 * ```
 *
 * @module
 */

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

/**
 * EtherType for IPv4 — used by {@linkcode decodeFrame} to dispatch into
 * {@linkcode ipv4Header}.
 */
export const ETHERTYPE_IPV4 = 0x0800;

/**
 * EtherType for ARP — used by {@linkcode decodeFrame} to dispatch into
 * {@linkcode arpEthernetIpv4}.
 */
export const ETHERTYPE_ARP = 0x0806;

/**
 * IPv4 protocol number for ICMP.
 */
export const IP_PROTOCOL_ICMP = 1;

/**
 * IPv4 protocol number for UDP.
 */
export const IP_PROTOCOL_UDP = 17;

/**
 * Layer-4 (transport) result of {@linkcode decodeFrame}.
 *
 * Discriminated by `kind`. Currently covers UDP and ICMPv4, with everything
 * else surfacing as `unsupported` carrying the raw payload and IPv4 protocol
 * number so callers can dispatch further on their own.
 */
export type L4Layer =
  | { readonly kind: "udp"; readonly datagram: UdpDatagram }
  | { readonly kind: "icmp"; readonly packet: IcmpPacket }
  | {
    readonly kind: "unsupported";
    readonly protocol: number;
    readonly payload: Uint8Array;
  };

/**
 * Layer-3 (network) result of {@linkcode decodeFrame}.
 *
 * Discriminated by `kind`. Currently covers IPv4 (with a nested `l4`) and ARP
 * (which has no L4); other EtherTypes surface as `unsupported`.
 */
export type L3Layer =
  | {
    readonly kind: "ipv4";
    readonly header: Ipv4Header;
    readonly l4: L4Layer;
  }
  | { readonly kind: "arp"; readonly packet: ArpEthernetIpv4Packet }
  | {
    readonly kind: "unsupported";
    readonly etherType: number;
    readonly payload: Uint8Array;
  };

/**
 * Full result of {@linkcode decodeFrame}: the Ethernet II frame plus its
 * decoded L3 (and, for IPv4, L4) layers.
 */
export interface DecodedFrame {
  readonly ethernet: Ethernet2Frame;
  readonly l3: L3Layer;
}

/**
 * Decodes an Ethernet II frame and walks the inet stack one layer at a time,
 * returning a typed tree of whatever the family's coders can recognize.
 *
 * Layers that don't have a matching `@binstruct/*` coder surface as a
 * `{ kind: "unsupported", ..., payload }` leaf instead of throwing — that
 * keeps the function safe to point at arbitrary captured traffic.
 *
 * @param frame Bytes of a single Ethernet II frame (no FCS).
 * @returns The decoded frame and the layered protocol view below it.
 *
 * @example IPv4 + ICMP echo
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { decodeFrame } from "@hertzg/inet";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 * import { ipv4Header } from "@binstruct/ipv4";
 * import { icmpHeader } from "@binstruct/icmp";
 *
 * const icmp = new Uint8Array(8);
 * icmpHeader().encode({
 *   type: 8, code: 0, checksum: 0,
 *   restOfHeader: new Uint8Array([0, 1, 0, 1]),
 *   payload: new Uint8Array(0),
 * }, icmp);
 *
 * const ip = new Uint8Array(20 + 8);
 * ipv4Header().encode({
 *   versionIhl: { version: 4, ihl: 5 },
 *   typeOfService: 0,
 *   totalLength: 28,
 *   identification: 0,
 *   flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *   timeToLive: 64,
 *   protocol: 1,
 *   headerChecksum: 0,
 *   sourceAddress: "10.0.0.1",
 *   destinationAddress: "10.0.0.2",
 *   options: new Uint8Array(0),
 * }, ip);
 * ip.set(icmp, 20);
 *
 * const frame = new Uint8Array(14 + 28);
 * ethernet2Frame().encode({
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x0800,
 *   payload: ip,
 * }, frame);
 *
 * const parsed = decodeFrame(frame);
 * assert(parsed.l3.kind === "ipv4" && parsed.l3.l4.kind === "icmp");
 * assertEquals(parsed.l3.l4.packet.type, 8);
 * ```
 *
 * @example Unknown EtherType surfaces as `unsupported`
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeFrame } from "@hertzg/inet";
 * import { ethernet2Frame } from "@binstruct/ethernet";
 *
 * const frame = new Uint8Array(14 + 4);
 * ethernet2Frame().encode({
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x88cc, // LLDP — no coder for it in the family yet.
 *   payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
 * }, frame);
 *
 * const parsed = decodeFrame(frame);
 * assertEquals(parsed.l3.kind, "unsupported");
 * if (parsed.l3.kind === "unsupported") {
 *   assertEquals(parsed.l3.etherType, 0x88cc);
 *   assertEquals(parsed.l3.payload, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
 * }
 * ```
 */
export function decodeFrame(frame: Uint8Array): DecodedFrame {
  const [ethernet] = ethernet2Frame().decode(frame);
  return { ethernet, l3: decodeL3(ethernet.etherType, ethernet.payload) };
}

function decodeL3(etherType: number, payload: Uint8Array): L3Layer {
  switch (etherType) {
    case ETHERTYPE_IPV4: {
      const [header] = ipv4Header().decode(payload);
      const headerBytes = header.versionIhl.ihl * 4;
      const l4Bytes = payload.subarray(headerBytes, header.totalLength);
      return { kind: "ipv4", header, l4: decodeL4(header.protocol, l4Bytes) };
    }
    case ETHERTYPE_ARP: {
      const [packet] = arpEthernetIpv4().decode(payload);
      return { kind: "arp", packet };
    }
    default:
      return { kind: "unsupported", etherType, payload };
  }
}

function decodeL4(protocol: number, payload: Uint8Array): L4Layer {
  switch (protocol) {
    case IP_PROTOCOL_ICMP: {
      const [packet] = icmpHeader().decode(payload);
      return { kind: "icmp", packet };
    }
    case IP_PROTOCOL_UDP: {
      const [datagram] = udpDatagram().decode(payload);
      return { kind: "udp", datagram };
    }
    default:
      return { kind: "unsupported", protocol, payload };
  }
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
 * the completed packet returns 0, which is the standard receiver-side
 * verification.
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
 * import { internetChecksum } from "@hertzg/inet";
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
 * import { internetChecksum } from "@hertzg/inet";
 *
 * // ICMP echo request with checksum already filled in.
 * // deno-fmt-ignore
 * const echoRequest = new Uint8Array([
 *   0x08, 0x00, 0xf7, 0xfd, 0x00, 0x01, 0x00, 0x01,
 * ]);
 * assertEquals(internetChecksum(echoRequest), 0x0000);
 * ```
 *
 * @example Odd-length input pads with a trailing zero byte
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { internetChecksum } from "@hertzg/inet";
 *
 * // Three bytes are summed as 0x0102 + 0x0300, then complemented.
 * assertEquals(internetChecksum(new Uint8Array([0x01, 0x02, 0x03])), 0xfbfd);
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
