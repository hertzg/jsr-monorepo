/**
 * ARP (Address Resolution Protocol) packet encoding and decoding utilities.
 *
 * Implements the wire format described in RFC 826 for the common
 * Ethernet/IPv4 case (28 bytes, fixed `hlen=6` / `plen=4`). Hardware
 * addresses are exposed as raw 6-byte arrays; IPv4 protocol addresses
 * are exposed as 32-bit numbers, matching the convention used by
 * [`@hertzg/ip`](https://jsr.io/@hertzg/ip) (use {@link stringifyIpv4} /
 * {@link parseIpv4} to convert to/from dotted-decimal notation).
 *
 * The MAC address helpers ({@link parseMacAddress},
 * {@link stringifyMacAddress}) and the {@link ARP_OPCODE} /
 * {@link ARP_HARDWARE_TYPE} / {@link ARP_PROTOCOL_TYPE} constant maps are
 * provided for ergonomic composition with {@link refine}.
 *
 * @example Decode an Ethernet/IPv4 ARP request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIpv4 } from "@hertzg/ip";
 * import {
 *   ARP_HARDWARE_TYPE,
 *   ARP_OPCODE,
 *   ARP_PROTOCOL_TYPE,
 *   arpEthernetIpv4,
 *   stringifyMacAddress,
 * } from "@binstruct/arp";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x00, 0x01,                         // htype: Ethernet
 *   0x08, 0x00,                         // ptype: IPv4
 *   0x06,                               // hlen
 *   0x04,                               // plen
 *   0x00, 0x01,                         // oper: request
 *   0x00, 0x11, 0x22, 0x33, 0x44, 0x55, // sha
 *   0xc0, 0xa8, 0x01, 0x01,             // spa: 192.168.1.1
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // tha (unknown)
 *   0xc0, 0xa8, 0x01, 0x02,             // tpa: 192.168.1.2
 * ]);
 *
 * const [packet, bytesRead] = arpEthernetIpv4().decode(wire);
 *
 * assertEquals(bytesRead, 28);
 * assertEquals(packet.htype, ARP_HARDWARE_TYPE.ETHERNET);
 * assertEquals(packet.ptype, ARP_PROTOCOL_TYPE.IPV4);
 * assertEquals(packet.oper, ARP_OPCODE.REQUEST);
 * assertEquals(stringifyMacAddress(packet.sha), "00:11:22:33:44:55");
 * assertEquals(stringifyIpv4(packet.spa), "192.168.1.1");
 * assertEquals(stringifyIpv4(packet.tpa), "192.168.1.2");
 * ```
 *
 * @module @binstruct/arp
 */

import { bytes, struct, u16be, u32be, u8 } from "@hertzg/binstruct";
import type { Coder } from "@hertzg/binstruct";

/**
 * Length of an Ethernet hardware address in bytes.
 */
export const ARP_HW_LEN_ETHERNET = 6;

/**
 * Length of an IPv4 protocol address in bytes.
 */
export const ARP_PROTO_LEN_IPV4 = 4;

/**
 * Total wire size of an Ethernet/IPv4 ARP packet, in bytes.
 */
export const ARP_ETHERNET_IPV4_SIZE = 28;

/**
 * ARP hardware type values (the `htype` field) for common link layers.
 *
 * The full IANA registry is at
 * <https://www.iana.org/assignments/arp-parameters/arp-parameters.xhtml>;
 * only the most common value is exposed here for convenience. Use a raw
 * number for anything not listed.
 */
export const ARP_HARDWARE_TYPE = {
  /** Ethernet (10/100/1000Mb). */
  ETHERNET: 0x0001,
} as const;

/**
 * Union of the {@link ARP_HARDWARE_TYPE} values.
 */
export type ArpHardwareType =
  (typeof ARP_HARDWARE_TYPE)[keyof typeof ARP_HARDWARE_TYPE];

/**
 * ARP protocol type values (the `ptype` field) for common upper layers.
 *
 * Encoded as the corresponding EtherType. Use a raw number for anything
 * not listed.
 */
export const ARP_PROTOCOL_TYPE = {
  /** Internet Protocol version 4. */
  IPV4: 0x0800,
} as const;

/**
 * Union of the {@link ARP_PROTOCOL_TYPE} values.
 */
export type ArpProtocolType =
  (typeof ARP_PROTOCOL_TYPE)[keyof typeof ARP_PROTOCOL_TYPE];

/**
 * ARP operation codes (the `oper` field).
 *
 * Includes the original ARP request/reply pair (RFC 826) and the RARP
 * variants (RFC 903) for completeness.
 */
export const ARP_OPCODE = {
  /** ARP request — "who has TPA, tell SPA". */
  REQUEST: 1,
  /** ARP reply — sender's MAC for the requested protocol address. */
  REPLY: 2,
  /** RARP request — "who am I", given my hardware address (RFC 903). */
  RARP_REQUEST: 3,
  /** RARP reply — protocol address for the requested hardware address. */
  RARP_REPLY: 4,
} as const;

/**
 * Union of the {@link ARP_OPCODE} values.
 */
export type ArpOpcode = (typeof ARP_OPCODE)[keyof typeof ARP_OPCODE];

/**
 * Decoded representation of an Ethernet/IPv4 ARP packet (RFC 826, 28 bytes).
 *
 * @property htype - Hardware type (e.g. {@link ARP_HARDWARE_TYPE.ETHERNET}).
 * @property ptype - Protocol type as an EtherType (e.g. {@link ARP_PROTOCOL_TYPE.IPV4}).
 * @property hlen - Hardware address length in bytes; always `6` for Ethernet.
 * @property plen - Protocol address length in bytes; always `4` for IPv4.
 * @property oper - Operation code (see {@link ARP_OPCODE}).
 * @property sha - Sender hardware address (6 bytes).
 * @property spa - Sender protocol (IPv4) address as a 32-bit unsigned integer.
 * @property tha - Target hardware address (6 bytes); typically zero in requests.
 * @property tpa - Target protocol (IPv4) address as a 32-bit unsigned integer.
 */
export interface ArpEthernetIpv4Packet {
  htype: number;
  ptype: number;
  hlen: number;
  plen: number;
  oper: number;
  sha: Uint8Array;
  spa: number;
  tha: Uint8Array;
  tpa: number;
}

/**
 * Creates a coder for the common Ethernet/IPv4 ARP packet (RFC 826).
 *
 * The wire layout is fixed at 28 bytes:
 *
 * ```text
 *   0                   1                   2                   3
 *   0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1 2 3 4 5 6 7 8 9 0 1
 *  +-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+-+
 *  |          Hardware type        |          Protocol type        |
 *  +---------------+---------------+-------------------------------+
 *  |  Hlen (=6)    |  Plen (=4)    |          Operation            |
 *  +---------------+---------------+-------------------------------+
 *  |                Sender hardware address (sha)                  |
 *  +                               +-------------------------------+
 *  |                               |   Sender proto address (spa)  |
 *  +-------------------------------+                               +
 *  |                               |   Target hardware address     |
 *  +-------------------------------+                               +
 *  |                                                               |
 *  +-------------------------------+-------------------------------+
 *  |                Target protocol address (tpa)                  |
 *  +---------------------------------------------------------------+
 * ```
 *
 * Hardware addresses are surfaced as raw {@linkcode Uint8Array}s; IPv4
 * protocol addresses are surfaced as 32-bit unsigned integers. Use
 * {@link stringifyMacAddress} / {@link parseMacAddress} and the helpers
 * from [`@hertzg/ip`](https://jsr.io/@hertzg/ip) (`parseIpv4` /
 * `stringifyIpv4`) for human-readable forms.
 *
 * @returns A coder for {@link ArpEthernetIpv4Packet} values.
 *
 * @example Round-trip encode and decode an ARP reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip";
 * import {
 *   ARP_ETHERNET_IPV4_SIZE,
 *   ARP_HARDWARE_TYPE,
 *   ARP_HW_LEN_ETHERNET,
 *   ARP_OPCODE,
 *   ARP_PROTOCOL_TYPE,
 *   ARP_PROTO_LEN_IPV4,
 *   arpEthernetIpv4,
 *   parseMacAddress,
 * } from "@binstruct/arp";
 *
 * const coder = arpEthernetIpv4();
 * const reply = {
 *   htype: ARP_HARDWARE_TYPE.ETHERNET,
 *   ptype: ARP_PROTOCOL_TYPE.IPV4,
 *   hlen: ARP_HW_LEN_ETHERNET,
 *   plen: ARP_PROTO_LEN_IPV4,
 *   oper: ARP_OPCODE.REPLY,
 *   sha: parseMacAddress("aa:bb:cc:dd:ee:ff"),
 *   spa: parseIpv4("192.168.1.2"),
 *   tha: parseMacAddress("00:11:22:33:44:55"),
 *   tpa: parseIpv4("192.168.1.1"),
 * };
 *
 * const buffer = new Uint8Array(ARP_ETHERNET_IPV4_SIZE);
 * const bytesWritten = coder.encode(reply, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, ARP_ETHERNET_IPV4_SIZE);
 * assertEquals(bytesRead, ARP_ETHERNET_IPV4_SIZE);
 * assertEquals(decoded, reply);
 * ```
 */
export function arpEthernetIpv4(): Coder<ArpEthernetIpv4Packet> {
  return struct({
    htype: u16be(),
    ptype: u16be(),
    hlen: u8(),
    plen: u8(),
    oper: u16be(),
    sha: bytes(ARP_HW_LEN_ETHERNET),
    spa: u32be(),
    tha: bytes(ARP_HW_LEN_ETHERNET),
    tpa: u32be(),
  });
}

/**
 * Formats a MAC address byte array as a colon-separated hexadecimal string.
 *
 * Reads the first 6 bytes of `address`; bytes beyond index 5 are ignored
 * and missing bytes are filled with zeros.
 *
 * @param address - MAC address bytes; only the first 6 are used.
 * @param delimiter - Separator between bytes (default: `":"`).
 * @returns A lowercase, fixed-width MAC string such as `"00:11:22:33:44:55"`.
 *
 * @example Default colon delimiter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyMacAddress } from "@binstruct/arp";
 *
 * assertEquals(
 *   stringifyMacAddress(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff])),
 *   "aa:bb:cc:dd:ee:ff",
 * );
 * ```
 *
 * @example Custom delimiter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyMacAddress } from "@binstruct/arp";
 *
 * assertEquals(
 *   stringifyMacAddress(new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55]), "-"),
 *   "00-11-22-33-44-55",
 * );
 * ```
 */
export function stringifyMacAddress(
  address: Uint8Array,
  delimiter: string = ":",
): string {
  const macBytes = new Uint8Array(ARP_HW_LEN_ETHERNET);
  macBytes.set(address.subarray(0, ARP_HW_LEN_ETHERNET), 0);
  return Array.from(macBytes, (b) => b.toString(16).padStart(2, "0"))
    .join(delimiter);
}

/**
 * Parses a delimited hexadecimal MAC address string into a 6-byte array.
 *
 * Accepts upper, lower, or mixed-case hex digits. The string must contain
 * exactly six parts separated by `delimiter`; each part must parse as a
 * byte in the range `0x00`–`0xff`.
 *
 * @param mac - The MAC address string (e.g. `"00:11:22:33:44:55"`).
 * @param delimiter - Separator between bytes (default: `":"`).
 * @returns A {@linkcode Uint8Array} of length 6.
 * @throws {Error} If the string does not contain exactly 6 parts.
 * @throws {Error} If a part is not a valid byte.
 *
 * @example Round-trip with {@link stringifyMacAddress}
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMacAddress, stringifyMacAddress } from "@binstruct/arp";
 *
 * const bytes = parseMacAddress("AA:BB:CC:DD:EE:FF");
 * assertEquals(bytes, new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff]));
 * assertEquals(stringifyMacAddress(bytes), "aa:bb:cc:dd:ee:ff");
 * ```
 */
export function parseMacAddress(
  mac: string,
  delimiter: string = ":",
): Uint8Array {
  const parts = mac.split(delimiter);
  if (parts.length !== ARP_HW_LEN_ETHERNET) {
    throw new Error(
      `Invalid MAC address format: expected ${ARP_HW_LEN_ETHERNET} parts separated by "${delimiter}", got ${parts.length}`,
    );
  }

  const out = new Uint8Array(ARP_HW_LEN_ETHERNET);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const byte = Number.parseInt(part, 16);
    if (Number.isNaN(byte) || byte < 0 || byte > 0xff) {
      throw new Error(`Invalid MAC address byte: "${part}"`);
    }
    out[i] = byte;
  }
  return out;
}
