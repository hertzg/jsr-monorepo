/**
 * Refiner factories for composing ICMPv4 into a higher-level packet stack.
 *
 * @module
 */

import {
  type Context,
  decode,
  encode,
  type Refiner,
} from "@hertzg/binstruct";
import type { Ipv4Datagram } from "@binstruct/ipv4";
import { type IcmpPacket, icmpHeader } from "./header.ts";

/** Refined IPv4 datagram whose payload is a typed ICMPv4 packet. */
export type Ipv4WithIcmp = Omit<Ipv4Datagram, "payload"> & {
  payload: { kind: "icmp"; icmp: IcmpPacket };
};

/**
 * Refiner that swaps an IPv4 datagram's raw payload for a decoded ICMPv4
 * packet.
 *
 * Use as a `refineSwitch` arm when an IPv4 datagram's `protocol` field
 * selects ICMP (`1`).
 *
 * @returns A `Refiner` suitable for `refineSwitch`.
 *
 * @example Compose with IPv4 via refineSwitch
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { refineSwitch, type Context } from "@hertzg/binstruct";
 * import { ipv4Datagram, type Ipv4Datagram } from "@binstruct/ipv4";
 * import { icmpRefiner } from "@binstruct/icmp";
 *
 * const coder = refineSwitch(
 *   ipv4Datagram(),
 *   { icmp: icmpRefiner() },
 *   {
 *     refine: (d: Ipv4Datagram, _ctx: Context) => d.protocol === 1 ? "icmp" : null,
 *     unrefine: (_r, _ctx: Context) => "icmp",
 *   },
 * );
 *
 * const buf = new Uint8Array(64);
 * coder.encode({
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
 *   payload: {
 *     kind: "icmp",
 *     icmp: {
 *       type: 8, code: 0, checksum: 0,
 *       restOfHeader: new Uint8Array([0, 1, 0, 1]),
 *       payload: new Uint8Array(0),
 *     },
 *   },
 * }, buf);
 *
 * const [decoded] = coder.decode(buf);
 * assert(!(decoded.payload instanceof Uint8Array) && decoded.payload.kind === "icmp");
 * assertEquals(decoded.payload.icmp.type, 8);
 * ```
 */
export function icmpRefiner(): Refiner<Ipv4Datagram, Ipv4WithIcmp, []> {
  return {
    refine: (host: Ipv4Datagram, ctx: Context): Ipv4WithIcmp => ({
      ...host,
      payload: {
        kind: "icmp",
        icmp: decode(icmpHeader(), host.payload, ctx),
      },
    }),
    unrefine: (refined: Ipv4WithIcmp, ctx: Context): Ipv4Datagram => ({
      ...refined,
      payload: encode(icmpHeader(), refined.payload.icmp, ctx),
    }),
  };
}
