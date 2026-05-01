/**
 * Inet stack coder for the `@binstruct/*` packet family.
 *
 * `@binstruct/inet` is a thin orchestration layer: each protocol package
 * (`@binstruct/ethernet`, `@binstruct/ipv4`, `@binstruct/arp`,
 * `@binstruct/udp`, `@binstruct/icmp`) only knows how to decode its own
 * layer's bytes. This package wires them together via `refineSwitch` —
 * dispatching on `etherType` at L3 and `protocol` at L4 — into a single
 * round-trippable {@linkcode inetFrame} coder factory that walks an
 * Ethernet II frame top-down. Each layer's `payload` field is replaced with
 * a discriminated union of the next layer's decoded form; layers we don't
 * have a coder for default to a raw {@linkcode Uint8Array}, so the coder is
 * safe to point at arbitrary captured traffic.
 *
 * Coverage:
 *
 * - L2 — Ethernet II (`@binstruct/ethernet`)
 * - L3 — IPv4 (`@binstruct/ipv4`), ARP (`@binstruct/arp`)
 * - L4 (under IPv4) — UDP (`@binstruct/udp`), ICMPv4 (`@binstruct/icmp`)
 *
 * Adding a layer is one new refiner here plus one entry in the relevant
 * `refineSwitch` arm.
 *
 * Also exports {@linkcode internetChecksum} (RFC 1071) for callers that need
 * to fill in IPv4/UDP/ICMP/TCP checksum fields.
 *
 * @example Round-trip a UDP-over-IPv4-over-Ethernet frame
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { inetFrame } from "@binstruct/inet";
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
 *       sourceAddress: parseIpv4("192.0.2.1"),
 *       destinationAddress: parseIpv4("192.0.2.2"),
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
 * const coder = inetFrame();
 * const buf = new Uint8Array(64);
 * const written = coder.encode(value, buf);
 * const [decoded] = coder.decode(buf.subarray(0, written));
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
  type Refiner,
  refineSwitch,
} from "@hertzg/binstruct";
import { type Ethernet2Frame, ethernet2Frame } from "@binstruct/ethernet";
import { type Arp, arp, ETHERTYPE_ARP } from "@binstruct/arp";
import { ETHERTYPE_IPV4, type Ipv4, ipv4 } from "@binstruct/ipv4";
import { icmpHeader, type IcmpPacket, IP_PROTOCOL_ICMP } from "@binstruct/icmp";
import { IP_PROTOCOL_UDP, type UdpDatagram, udpDatagram } from "@binstruct/udp";

// ---------------------------------------------------------------------------
// L4 — IPv4 transport layer
// ---------------------------------------------------------------------------

/** Refined IPv4 datagram with a UDP transport payload. */
export type Ipv4WithUdp = Omit<Ipv4, "payload"> & {
  payload: { kind: "udp"; udp: UdpDatagram };
};

/** Refined IPv4 datagram with an ICMPv4 transport payload. */
export type Ipv4WithIcmp = Omit<Ipv4, "payload"> & {
  payload: { kind: "icmp"; icmp: IcmpPacket };
};

/** Decoded IPv4 datagram — discriminated by `payload.kind` (or `Uint8Array`). */
export type Ipv4Refined = Ipv4WithUdp | Ipv4WithIcmp | Ipv4;

function udpRefiner(): Refiner<Ipv4, Ipv4WithUdp, []> {
  return {
    refine: (host: Ipv4, ctx: Context): Ipv4WithUdp => ({
      ...host,
      payload: { kind: "udp", udp: decode(udpDatagram(), host.payload, ctx) },
    }),
    unrefine: (refined: Ipv4WithUdp, ctx: Context): Ipv4 => ({
      ...refined,
      payload: encode(udpDatagram(), refined.payload.udp, ctx),
    }),
  };
}

function icmpRefiner(): Refiner<Ipv4, Ipv4WithIcmp, []> {
  return {
    refine: (host: Ipv4, ctx: Context): Ipv4WithIcmp => ({
      ...host,
      payload: { kind: "icmp", icmp: decode(icmpHeader(), host.payload, ctx) },
    }),
    unrefine: (refined: Ipv4WithIcmp, ctx: Context): Ipv4 => ({
      ...refined,
      payload: encode(icmpHeader(), refined.payload.icmp, ctx),
    }),
  };
}

function rawIpv4Refiner(): Refiner<Ipv4, Ipv4, []> {
  return {
    refine: (host: Ipv4): Ipv4 => host,
    unrefine: (refined: Ipv4): Ipv4 => refined,
  };
}

function ipv4Frame(): Coder<Ipv4Refined> {
  return refineSwitch(
    ipv4(),
    {
      udp: udpRefiner(),
      icmp: icmpRefiner(),
      raw: rawIpv4Refiner(),
    },
    {
      refine: (d: Ipv4): "udp" | "icmp" | "raw" => {
        switch (d.protocol) {
          case IP_PROTOCOL_UDP:
            return "udp";
          case IP_PROTOCOL_ICMP:
            return "icmp";
          default:
            return "raw";
        }
      },
      unrefine: (r: Ipv4Refined): "udp" | "icmp" | "raw" => {
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
}

// ---------------------------------------------------------------------------
// L3 — Ethernet payload (IPv4, ARP, or raw bytes)
// ---------------------------------------------------------------------------

/** Refined frame whose payload is a typed IPv4 datagram. */
export type FrameWithIpv4 = Omit<Ethernet2Frame, "payload"> & {
  payload: { kind: "ipv4"; ipv4: Ipv4Refined };
};

/** Refined frame whose payload is an Ethernet/IPv4 ARP packet. */
export type FrameWithArp = Omit<Ethernet2Frame, "payload"> & {
  payload: { kind: "arp"; arp: Arp };
};

/** Decoded Ethernet II frame — discriminated by `payload.kind` (or `Uint8Array`). */
export type InetFrameRefined = FrameWithIpv4 | FrameWithArp | Ethernet2Frame;

function ipv4FrameRefiner(): Refiner<Ethernet2Frame, FrameWithIpv4, []> {
  const inner = ipv4Frame();
  return {
    refine: (frame: Ethernet2Frame, ctx: Context): FrameWithIpv4 => ({
      ...frame,
      payload: {
        kind: "ipv4",
        ipv4: decode(inner, frame.payload, ctx),
      },
    }),
    unrefine: (refined: FrameWithIpv4, ctx: Context): Ethernet2Frame => ({
      ...refined,
      payload: encode(inner, refined.payload.ipv4, ctx),
    }),
  };
}

function arpFrameRefiner(): Refiner<Ethernet2Frame, FrameWithArp, []> {
  return {
    refine: (frame: Ethernet2Frame, ctx: Context): FrameWithArp => ({
      ...frame,
      payload: {
        kind: "arp",
        arp: decode(arp(), frame.payload, ctx),
      },
    }),
    unrefine: (refined: FrameWithArp, ctx: Context): Ethernet2Frame => ({
      ...refined,
      payload: encode(arp(), refined.payload.arp, ctx),
    }),
  };
}

function rawFrameRefiner(): Refiner<Ethernet2Frame, Ethernet2Frame, []> {
  return {
    refine: (frame: Ethernet2Frame): Ethernet2Frame => frame,
    unrefine: (refined: Ethernet2Frame): Ethernet2Frame => refined,
  };
}

/**
 * Creates a composed coder that walks an Ethernet II frame top-down,
 * dispatching the payload by `etherType` (L3) and then by `protocol` (L4
 * under IPv4). Frames with no matching coder surface their payload as a raw
 * `Uint8Array`.
 *
 * @returns A coder for {@link InetFrameRefined} values.
 */
export function inetFrame(): Coder<InetFrameRefined> {
  return refineSwitch(
    ethernet2Frame(),
    {
      ipv4: ipv4FrameRefiner(),
      arp: arpFrameRefiner(),
      raw: rawFrameRefiner(),
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
      unrefine: (refined: InetFrameRefined): "ipv4" | "arp" | "raw" => {
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
