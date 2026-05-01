/**
 * Inet stack coder for the `@binstruct/*` packet family.
 *
 * `@binstruct/inet` is a thin orchestration layer: it composes the per-package
 * `as<Protocol>` refiner factories into a single round-trippable
 * {@linkcode inetCoder} that walks an Ethernet II frame top-down. Each layer's
 * `payload` field is replaced with a discriminated union of the next layer's
 * decoded form; layers we don't have a coder for default to a raw
 * {@linkcode Uint8Array}, so the coder is safe to point at arbitrary captured
 * traffic.
 *
 * Coverage as of 0.1:
 *
 * - L2 — Ethernet II (`@binstruct/ethernet`)
 * - L3 — IPv4 (`@binstruct/ipv4` via `ipv4Refiner`), ARP (`@binstruct/arp` via `arpRefiner`)
 * - L4 (under IPv4) — UDP (`@binstruct/udp` via `udpRefiner`),
 *   ICMPv4 (`@binstruct/icmp` via `icmpRefiner`)
 *
 * Adding a layer is one new `as<Protocol>` factory in the protocol's package
 * plus one entry in this file's `refineSwitch` arms.
 *
 * Also exports {@linkcode rawRefiner} — the identity refiner used for the
 * "unknown protocol" fallback at every level — and re-exports
 * {@linkcode internetChecksum} (RFC 1071) for callers that need to fill in
 * IPv4/UDP/ICMP/TCP checksum fields.
 *
 * @example Round-trip a UDP-over-IPv4-over-Ethernet frame
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { inetCoder } from "@binstruct/inet";
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
 * const buf = new Uint8Array(64);
 * const written = inetCoder.encode(value, buf);
 * const [decoded] = inetCoder.decode(buf.subarray(0, written));
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

import {
  type Coder,
  type Context,
  decode,
  encode,
  refineSwitch,
  type Refiner,
} from "@hertzg/binstruct";
import {
  type Ethernet2Frame,
  ethernet2Frame,
} from "@binstruct/ethernet";
import {
  type ArpEthernetIpv4Packet,
  arpEthernetIpv4,
  ETHERTYPE_ARP,
} from "@binstruct/arp";
import {
  ETHERTYPE_IPV4,
  type Ipv4Datagram,
  ipv4Datagram,
  type Ipv4Header,
} from "@binstruct/ipv4";
import {
  icmpHeader,
  type IcmpPacket,
  IP_PROTOCOL_ICMP,
} from "@binstruct/icmp";
import {
  IP_PROTOCOL_UDP,
  type UdpDatagram,
  udpDatagram,
} from "@binstruct/udp";

/**
 * Identity refiner for an Ethernet II frame whose EtherType has no decoder
 * in the family. Round-trips the frame unchanged so the raw payload bytes
 * surface to the caller.
 */
export const rawFrameRefiner: Refiner<Ethernet2Frame, Ethernet2Frame, []> = {
  refine: (frame: Ethernet2Frame, _ctx: Context): Ethernet2Frame => frame,
  unrefine: (refined: Ethernet2Frame, _ctx: Context): Ethernet2Frame => refined,
};

/**
 * Identity refiner for an IPv4 datagram whose `protocol` field has no
 * transport-layer decoder in the family. Round-trips the datagram unchanged.
 */
export const rawIpv4Refiner: Refiner<Ipv4Datagram, Ipv4Datagram, []> = {
  refine: (datagram: Ipv4Datagram, _ctx: Context): Ipv4Datagram => datagram,
  unrefine: (refined: Ipv4Datagram, _ctx: Context): Ipv4Datagram => refined,
};

// ---------------------------------------------------------------------------
// L4 — IPv4 transport layer
// ---------------------------------------------------------------------------

/** Refined IPv4 datagram with a UDP transport payload. */
export type Ipv4WithUdp = Omit<Ipv4Datagram, "payload"> & {
  payload: { kind: "udp"; udp: UdpDatagram };
};

/** Refined IPv4 datagram with an ICMPv4 transport payload. */
export type Ipv4WithIcmp = Omit<Ipv4Datagram, "payload"> & {
  payload: { kind: "icmp"; icmp: IcmpPacket };
};

/** Refined IPv4 datagram whose transport protocol has no coder in the family. */
export type Ipv4WithRawL4 = Ipv4Datagram;

/** Decoded IPv4 datagram — discriminated by `payload.kind` (or `Uint8Array`). */
export type Ipv4Decoded = Ipv4WithUdp | Ipv4WithIcmp | Ipv4WithRawL4;

/**
 * Refiner that swaps an IPv4 datagram's raw payload for a typed UDP datagram.
 * Used as a `refineSwitch` arm when the IPv4 `protocol` field selects UDP.
 */
export const udpRefiner: Refiner<Ipv4Datagram, Ipv4WithUdp, []> = {
  refine: (host: Ipv4Datagram, ctx: Context): Ipv4WithUdp => ({
    ...host,
    payload: { kind: "udp", udp: decode(udpDatagram(), host.payload, ctx) },
  }),
  unrefine: (refined: Ipv4WithUdp, ctx: Context): Ipv4Datagram => ({
    ...refined,
    payload: encode(udpDatagram(), refined.payload.udp, ctx),
  }),
};

/**
 * Refiner that swaps an IPv4 datagram's raw payload for a typed ICMPv4 packet.
 * Used as a `refineSwitch` arm when the IPv4 `protocol` field selects ICMP.
 */
export const icmpRefiner: Refiner<Ipv4Datagram, Ipv4WithIcmp, []> = {
  refine: (host: Ipv4Datagram, ctx: Context): Ipv4WithIcmp => ({
    ...host,
    payload: { kind: "icmp", icmp: decode(icmpHeader(), host.payload, ctx) },
  }),
  unrefine: (refined: Ipv4WithIcmp, ctx: Context): Ipv4Datagram => ({
    ...refined,
    payload: encode(icmpHeader(), refined.payload.icmp, ctx),
  }),
};

/**
 * IPv4 datagram coder that further refines the L4 payload via `refineSwitch`
 * on the `protocol` field. UDP, ICMPv4, and raw bytes branches are dispatched
 * by examining the `protocol` field of the decoded base datagram.
 */
const ipv4Coder: Coder<Ipv4Decoded> = refineSwitch(
  ipv4Datagram(),
  {
    udp: udpRefiner,
    icmp: icmpRefiner,
    raw: rawIpv4Refiner,
  },
  {
    refine: (d: Ipv4Datagram): "udp" | "icmp" | "raw" => {
      switch (d.protocol) {
        case IP_PROTOCOL_UDP:
          return "udp";
        case IP_PROTOCOL_ICMP:
          return "icmp";
        default:
          return "raw";
      }
    },
    unrefine: (r: Ipv4Decoded): "udp" | "icmp" | "raw" => {
      if (r.payload instanceof Uint8Array) return "raw";
      switch (r.payload.kind) {
        case "udp":
          return "udp";
        case "icmp":
          return "icmp";
      }
    },
  },
);

// ---------------------------------------------------------------------------
// L3 — Ethernet payload (IPv4, ARP, or raw bytes)
// ---------------------------------------------------------------------------

/** Refined frame whose payload is an IPv4 datagram with a typed L4. */
export type FrameWithIpv4<TIpv4 extends Ipv4Header = Ipv4Decoded> =
  & Omit<Ethernet2Frame, "payload">
  & { payload: { kind: "ipv4"; ipv4: TIpv4 } };

/** Refined frame whose payload is an Ethernet/IPv4 ARP packet. */
export type FrameWithArp = Omit<Ethernet2Frame, "payload"> & {
  payload: { kind: "arp"; arp: ArpEthernetIpv4Packet };
};

/** Refined frame whose EtherType has no coder in the family. */
export type FrameWithRawL3 = Ethernet2Frame;

/** Decoded Ethernet II frame — discriminated by `payload.kind` (or `Uint8Array`). */
export type FrameDecoded = FrameWithIpv4 | FrameWithArp | FrameWithRawL3;

/**
 * Refiner factory that swaps an Ethernet frame's raw payload for a typed IPv4
 * datagram. Used as a `refineSwitch` arm when the Ethernet `etherType` selects
 * IPv4. The inner `coder` is the IPv4 coder to use — pass `ipv4Datagram()` for
 * raw L4 payload, or {@linkcode ipv4Coder} (this module's local coder) for
 * the fully refined L4 dispatch.
 */
export function ipv4Refiner<TIpv4 extends Ipv4Header>(
  coder: Coder<TIpv4>,
): Refiner<Ethernet2Frame, FrameWithIpv4<TIpv4>, []> {
  return {
    refine: (frame: Ethernet2Frame, ctx: Context): FrameWithIpv4<TIpv4> => ({
      ...frame,
      payload: { kind: "ipv4", ipv4: decode(coder, frame.payload, ctx) },
    }),
    unrefine: (
      refined: FrameWithIpv4<TIpv4>,
      ctx: Context,
    ): Ethernet2Frame => ({
      ...refined,
      payload: encode(coder, refined.payload.ipv4, ctx),
    }),
  };
}

/**
 * Refiner that swaps an Ethernet frame's raw payload for a typed
 * Ethernet/IPv4 ARP packet. Used as a `refineSwitch` arm when the Ethernet
 * `etherType` selects ARP.
 */
export const arpRefiner: Refiner<Ethernet2Frame, FrameWithArp, []> = {
  refine: (frame: Ethernet2Frame, ctx: Context): FrameWithArp => ({
    ...frame,
    payload: {
      kind: "arp",
      arp: decode(arpEthernetIpv4(), frame.payload, ctx),
    },
  }),
  unrefine: (refined: FrameWithArp, ctx: Context): Ethernet2Frame => ({
    ...refined,
    payload: encode(arpEthernetIpv4(), refined.payload.arp, ctx),
  }),
};

/**
 * Composed Ethernet II frame coder built from per-package refiner factories.
 * Returns a single `Coder<FrameDecoded>` that round-trips bytes through the
 * full structured representation.
 *
 * @example Round-trip an ARP request
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { ARP_OPCODE } from "@binstruct/arp";
 * import { inetCoder } from "@binstruct/inet";
 *
 * const value = {
 *   dstMac: new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x0806,
 *   payload: {
 *     kind: "arp" as const,
 *     arp: {
 *       htype: 1, ptype: 0x0800, hlen: 6, plen: 4,
 *       oper: ARP_OPCODE.REQUEST,
 *       sha: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *       spa: 0xc0000201,
 *       tha: new Uint8Array([0, 0, 0, 0, 0, 0]),
 *       tpa: 0xc0000202,
 *     },
 *   },
 * };
 *
 * const buf = new Uint8Array(64);
 * const written = inetCoder.encode(value, buf);
 * const [decoded] = inetCoder.decode(buf.subarray(0, written));
 *
 * assert(!(decoded.payload instanceof Uint8Array));
 * assert(decoded.payload.kind === "arp");
 * assertEquals(decoded.payload.arp.oper, ARP_OPCODE.REQUEST);
 * ```
 *
 * @example Unknown EtherType keeps payload as raw bytes
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { inetCoder } from "@binstruct/inet";
 *
 * const value = {
 *   dstMac: new Uint8Array([0, 0, 0, 0, 0, 1]),
 *   srcMac: new Uint8Array([0, 0, 0, 0, 0, 2]),
 *   etherType: 0x88cc, // LLDP — no coder for it.
 *   payload: new Uint8Array([0x01, 0x02, 0x03, 0x04]),
 * };
 *
 * const buf = new Uint8Array(32);
 * const written = inetCoder.encode(value, buf);
 * const [decoded] = inetCoder.decode(buf.subarray(0, written));
 *
 * assert(decoded.payload instanceof Uint8Array);
 * assertEquals(decoded.payload, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
 * ```
 */
export const inetCoder: Coder<FrameDecoded> = refineSwitch(
  ethernet2Frame(),
  {
    ipv4: ipv4Refiner(ipv4Coder),
    arp: arpRefiner,
    raw: rawFrameRefiner,
  },
  {
    refine: (frame: Ethernet2Frame): "ipv4" | "arp" | "raw" => {
      switch (frame.etherType) {
        case ETHERTYPE_IPV4:
          return "ipv4";
        case ETHERTYPE_ARP:
          return "arp";
        default:
          return "raw";
      }
    },
    unrefine: (refined: FrameDecoded): "ipv4" | "arp" | "raw" => {
      if (refined.payload instanceof Uint8Array) return "raw";
      switch (refined.payload.kind) {
        case "ipv4":
          return "ipv4";
        case "arp":
          return "arp";
      }
    },
  },
);

// ---------------------------------------------------------------------------
// RFC 1071 internet checksum
// ---------------------------------------------------------------------------

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
