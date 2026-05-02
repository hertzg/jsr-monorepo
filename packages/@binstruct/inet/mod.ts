/**
 * Inet stack coder for the `@binstruct/*` packet family.
 *
 * `@binstruct/inet` is a thin orchestration layer: each protocol package
 * (`@binstruct/ethernet`, `@binstruct/ipv4`, `@binstruct/arp`,
 * `@binstruct/udp`, `@binstruct/icmp`) only knows how to decode its own
 * layer's bytes. This package wires them together via `refineSwitch` and
 * `refineFields` — dispatching on `etherType` at L3 and `protocol` at L4 —
 * into a single round-trippable {@linkcode inetFrame} coder factory that
 * walks an Ethernet II frame top-down. Each layer's `payload` field is
 * surfaced as the typed value of the next layer; layers we don't have a
 * coder for default to a raw {@linkcode Uint8Array}, so the coder is safe
 * to point at arbitrary captured traffic.
 *
 * Coverage:
 *
 * - L2 — Ethernet II (`@binstruct/ethernet`)
 * - L3 — IPv4 (`@binstruct/ipv4`), ARP (`@binstruct/arp`)
 * - L4 (under IPv4) — UDP (`@binstruct/udp`), ICMPv4 (`@binstruct/icmp`)
 *
 * Adding a layer is one new `refineFields` arm in the relevant
 * `refineSwitch` plus an entry in its selector.
 *
 * Also exports {@linkcode internetChecksum} (RFC 1071) for callers that need
 * to fill in IPv4/UDP/ICMP/TCP checksum fields.
 *
 * Each refined `payload` is the typed value directly — no `{ kind, ... }`
 * wrapper. The on-wire tag (`etherType` at L3, `protocol` at L4) on the host
 * record is the discriminator; narrow the union with property-existence
 * checks (`"protocol" in payload`, `"srcPort" in payload`, …) when reading
 * decoded values.
 *
 * @example Round-trip a UDP-over-IPv4-over-Ethernet frame
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { ETHERTYPE_IPV4 } from "@binstruct/ipv4";
 * import { IP_PROTOCOL_UDP } from "@binstruct/udp";
 * import { inetFrame } from "@binstruct/inet";
 *
 * const value = {
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: ETHERTYPE_IPV4,
 *   payload: {
 *     versionIhl: { version: 4, ihl: 5 },
 *     typeOfService: 0,
 *     totalLength: 32,
 *     identification: 0,
 *     flagsFragmentOffset: { reserved: 0, dontFragment: 0, moreFragments: 0, fragmentOffset: 0 },
 *     timeToLive: 64,
 *     protocol: IP_PROTOCOL_UDP,
 *     headerChecksum: 0,
 *     sourceAddress: parseIpv4("192.0.2.1"),
 *     destinationAddress: parseIpv4("192.0.2.2"),
 *     options: new Uint8Array(0),
 *     payload: {
 *       srcPort: 53,
 *       dstPort: 49152,
 *       length: 12,
 *       checksum: 0,
 *       payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
 *     },
 *   },
 * };
 *
 * const coder = inetFrame();
 * const buf = new Uint8Array(64);
 * const written = coder.encode(value, buf);
 * const [decoded] = coder.decode(buf.subarray(0, written));
 *
 * assert(!(decoded.payload instanceof Uint8Array));
 * assert("protocol" in decoded.payload);
 * assert(!(decoded.payload.payload instanceof Uint8Array));
 * assert("srcPort" in decoded.payload.payload);
 * assertEquals(decoded.payload.payload.payload, new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
 * ```
 *
 * @module
 */

import { type Coder, refineFields, refineSwitch } from "@hertzg/binstruct";
import {
  type Ethernet2Frame as Frame,
  ethernet2Frame,
} from "@binstruct/ethernet";
import { type ArpData, arpData, ETHERTYPE_ARP } from "@binstruct/arp";
import {
  ETHERTYPE_IPV4,
  type Ipv4Packet,
  ipv4Packet,
} from "@binstruct/ipv4";
import { type IcmpPacket, icmpPacket, IP_PROTOCOL_ICMP } from "@binstruct/icmp";
import { IP_PROTOCOL_UDP, type UdpPacket, udpPacket } from "@binstruct/udp";

/** IPv4 datagram with a typed UDP transport payload. */
export type Ipv4UdpPacket = Omit<Ipv4Packet, "payload"> & {
  payload: UdpPacket;
};

/** IPv4 datagram with a typed ICMPv4 transport payload. */
export type Ipv4IcmpPacket = Omit<Ipv4Packet, "payload"> & {
  payload: IcmpPacket;
};

/**
 * Refined IPv4 datagram — `payload` narrows by shape (UDP / ICMP / raw bytes)
 * and the host's `protocol` field is the on-wire discriminator.
 */
export type Ipv4Refined = Ipv4UdpPacket | Ipv4IcmpPacket | Ipv4Packet;

function ipv4Frame(): Coder<Ipv4Refined> {
  return refineSwitch(
    ipv4Packet(),
    {
      udp: refineFields({ payload: udpPacket() }),
      icmp: refineFields({ payload: icmpPacket() }),
      raw: refineFields({}),
    },
    {
      refine: (d): "udp" | "icmp" | "raw" => {
        switch (d.protocol) {
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMP:
            return "icmp";
          default:
            return "raw";
        }
      },
      unrefine: (r): "udp" | "icmp" | "raw" => {
        switch (r.protocol) {
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMP:
            return "icmp";
          default:
            return "raw";
        }
      },
    },
  );
}

/** Ethernet frame whose payload is a typed IPv4 datagram. */
export type Ipv4Frame = Omit<Frame, "payload"> & { payload: Ipv4Refined };

/** Ethernet frame whose payload is an Ethernet/IPv4 ARP packet. */
export type ArpFrame = Omit<Frame, "payload"> & { payload: ArpData };

/**
 * Decoded Ethernet II frame as produced by {@link inetFrame}.
 *
 * The shape depends on `etherType` and (for IPv4) the inner `protocol`
 * field; narrow the union with property-existence checks (`"protocol" in
 * payload`, `"srcPort" in payload`, …) when reading. Frames whose tag has no
 * matching coder surface their `payload` as a raw `Uint8Array`.
 */
export type FrameRefined = Ipv4Frame | ArpFrame | Frame;

/**
 * Creates a composed coder that walks an Ethernet II frame top-down,
 * dispatching the L3 payload by `etherType` and the L4 payload by IPv4's
 * `protocol`. Frames whose tag has no matching coder surface their payload
 * as a raw `Uint8Array`.
 */
export function inetFrame(): Coder<FrameRefined> {
  return refineSwitch(
    ethernet2Frame(),
    {
      ipv4: refineFields({ payload: ipv4Frame() }),
      arp: refineFields({ payload: arpData() }),
      raw: refineFields({}),
    },
    {
      refine: (frame: Frame): "ipv4" | "arp" | "raw" => {
        switch (frame.etherType) {
          case ETHERTYPE_IPV4:
            return "ipv4";
          case ETHERTYPE_ARP:
            return "arp";
          default:
            return "raw";
        }
      },
      unrefine: (refined): "ipv4" | "arp" | "raw" => {
        if (refined.payload instanceof Uint8Array) return "raw";
        switch (refined.etherType) {
          case ETHERTYPE_IPV4:
            return "ipv4";
          case ETHERTYPE_ARP:
            return "arp";
          default:
            return "raw";
        }
      },
    },
  );
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
