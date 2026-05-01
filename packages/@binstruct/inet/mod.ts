/**
 * Inet stack coder for the `@binstruct/*` packet family.
 *
 * {@linkcode inetCoder} is a single composed `Coder` that walks an Ethernet II
 * frame top-down using the family's own coders. The shape mirrors physical
 * layout: each layer's `payload` field is the decoded next layer (a
 * discriminated union), defaulting to a raw {@linkcode Uint8Array} when the
 * family doesn't have a coder for that protocol.
 *
 * Coverage as of 0.1:
 *
 * - L2 — Ethernet II ({@link https://jsr.io/@binstruct/ethernet @binstruct/ethernet})
 * - L3 — IPv4 ({@link https://jsr.io/@binstruct/ipv4 @binstruct/ipv4}),
 *   ARP ({@link https://jsr.io/@binstruct/arp @binstruct/arp})
 * - L4 (under IPv4) — UDP ({@link https://jsr.io/@binstruct/udp @binstruct/udp}),
 *   ICMPv4 ({@link https://jsr.io/@binstruct/icmp @binstruct/icmp})
 *
 * Adding TCP, IPv6, or other link types is one more refiner each.
 *
 * Composition is built entirely from `refine` and `refineSwitch` —
 * each layer's refiner uses `decode`/`encode` helpers to dispatch into the
 * next layer's coder, so `inetCoder` is a real binstruct coder that
 * round-trips bytes ↔ structured value.
 *
 * Also exports {@linkcode internetChecksum} (RFC 1071) — the 16-bit one's
 * complement sum used by IPv4, ICMPv4, UDP, and TCP.
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
 * const buffer = new Uint8Array(64);
 * const written = inetCoder.encode(value, buffer);
 * const [decoded] = inetCoder.decode(buffer.subarray(0, written));
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
  bytes,
  type Coder,
  type Context,
  decode,
  encode,
  refineSwitch,
  struct,
} from "@hertzg/binstruct";
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

// ---------------------------------------------------------------------------
// L4 — IPv4 transport layer
// ---------------------------------------------------------------------------

/**
 * IPv4 datagram base shape used as the input to the L4 `refineSwitch`.
 *
 * Captures the parsed header alongside the raw transport-layer payload bytes;
 * the per-protocol refiners flatten the header onto the top level and replace
 * `payload` with the decoded transport value.
 */
interface Ipv4DatagramBase {
  header: Ipv4Header;
  payload: Uint8Array;
}

const ipv4DatagramBase: Coder<Ipv4DatagramBase> = struct({
  header: ipv4Header(),
  payload: bytes(null),
});

/** Refined IPv4 datagram with a UDP transport payload. */
export type Ipv4WithUdp = Ipv4Header & {
  payload: { kind: "udp"; udp: UdpDatagram };
};

/** Refined IPv4 datagram with an ICMPv4 transport payload. */
export type Ipv4WithIcmp = Ipv4Header & {
  payload: { kind: "icmp"; icmp: IcmpPacket };
};

/** Refined IPv4 datagram whose transport protocol has no coder in the family. */
export type Ipv4WithRawL4 = Ipv4Header & { payload: Uint8Array };

/** Decoded IPv4 datagram — discriminated by `payload.kind` (or `Uint8Array`). */
export type Ipv4Decoded = Ipv4WithUdp | Ipv4WithIcmp | Ipv4WithRawL4;

/**
 * IPv4 datagram coder. Decodes header + raw payload, then dispatches on the
 * protocol field via `refineSwitch` to a typed transport-layer value.
 */
const ipv4Coder: Coder<Ipv4Decoded> = refineSwitch(
  ipv4DatagramBase,
  {
    udp: {
      refine: (base: Ipv4DatagramBase, ctx: Context): Ipv4WithUdp => ({
        ...base.header,
        payload: { kind: "udp", udp: decode(udpDatagram(), base.payload, ctx) },
      }),
      unrefine: (refined: Ipv4WithUdp, ctx: Context): Ipv4DatagramBase => {
        const { payload, ...header } = refined;
        return {
          header,
          payload: encode(udpDatagram(), payload.udp, ctx),
        };
      },
    },
    icmp: {
      refine: (base: Ipv4DatagramBase, ctx: Context): Ipv4WithIcmp => ({
        ...base.header,
        payload: {
          kind: "icmp",
          icmp: decode(icmpHeader(), base.payload, ctx),
        },
      }),
      unrefine: (refined: Ipv4WithIcmp, ctx: Context): Ipv4DatagramBase => {
        const { payload, ...header } = refined;
        return {
          header,
          payload: encode(icmpHeader(), payload.icmp, ctx),
        };
      },
    },
    raw: {
      refine: (base: Ipv4DatagramBase): Ipv4WithRawL4 => ({
        ...base.header,
        payload: base.payload,
      }),
      unrefine: (refined: Ipv4WithRawL4): Ipv4DatagramBase => {
        const { payload, ...header } = refined;
        return { header, payload };
      },
    },
  },
  {
    refine: (base: Ipv4DatagramBase): "udp" | "icmp" | "raw" =>
      base.header.protocol === IP_PROTOCOL_UDP
        ? "udp"
        : base.header.protocol === IP_PROTOCOL_ICMP
        ? "icmp"
        : "raw",
    unrefine: (refined: Ipv4Decoded): "udp" | "icmp" | "raw" => {
      if (refined.payload instanceof Uint8Array) return "raw";
      return refined.payload.kind;
    },
  },
);

// ---------------------------------------------------------------------------
// L3 — Ethernet payload (IPv4, ARP, or raw bytes)
// ---------------------------------------------------------------------------

/** Refined frame whose payload is an IPv4 datagram. */
export type FrameWithIpv4 = Omit<Ethernet2Frame, "payload"> & {
  payload: { kind: "ipv4"; ipv4: Ipv4Decoded };
};

/** Refined frame whose payload is an Ethernet/IPv4 ARP packet. */
export type FrameWithArp = Omit<Ethernet2Frame, "payload"> & {
  payload: { kind: "arp"; arp: ArpEthernetIpv4Packet };
};

/** Refined frame whose EtherType has no coder in the family. */
export type FrameWithRawL3 = Ethernet2Frame;

/** Decoded Ethernet II frame — discriminated by `payload.kind` (or `Uint8Array`). */
export type FrameDecoded = FrameWithIpv4 | FrameWithArp | FrameWithRawL3;

/**
 * Composed Ethernet II frame coder that walks the inet stack one layer at a
 * time using `refineSwitch`. Returns `Coder<FrameDecoded>` directly — no
 * factory call needed, the coder is reusable across encode/decode.
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
    ipv4: {
      refine: (frame: Ethernet2Frame, ctx: Context): FrameWithIpv4 => {
        const { payload, ...rest } = frame;
        return {
          ...rest,
          payload: { kind: "ipv4", ipv4: decode(ipv4Coder, payload, ctx) },
        };
      },
      unrefine: (refined: FrameWithIpv4, ctx: Context): Ethernet2Frame => {
        const { payload, ...rest } = refined;
        return {
          ...rest,
          payload: encode(ipv4Coder, payload.ipv4, ctx),
        };
      },
    },
    arp: {
      refine: (frame: Ethernet2Frame, ctx: Context): FrameWithArp => {
        const { payload, ...rest } = frame;
        return {
          ...rest,
          payload: {
            kind: "arp",
            arp: decode(arpEthernetIpv4(), payload, ctx),
          },
        };
      },
      unrefine: (refined: FrameWithArp, ctx: Context): Ethernet2Frame => {
        const { payload, ...rest } = refined;
        return {
          ...rest,
          payload: encode(arpEthernetIpv4(), payload.arp, ctx),
        };
      },
    },
    raw: {
      refine: (frame: Ethernet2Frame): FrameWithRawL3 => frame,
      unrefine: (refined: FrameWithRawL3): Ethernet2Frame => refined,
    },
  },
  {
    refine: (frame: Ethernet2Frame): "ipv4" | "arp" | "raw" =>
      frame.etherType === ETHERTYPE_IPV4
        ? "ipv4"
        : frame.etherType === ETHERTYPE_ARP
        ? "arp"
        : "raw",
    unrefine: (refined: FrameDecoded): "ipv4" | "arp" | "raw" => {
      if (refined.payload instanceof Uint8Array) return "raw";
      return refined.payload.kind;
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
