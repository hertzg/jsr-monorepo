/**
 * ARP (Address Resolution Protocol) packet encoding and decoding.
 *
 * An Ethernet/IPv4 ARP packet is a fixed 28 bytes of header fields and
 * sender/target addresses (no payload):
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * | Hardware Type   |  Protocol Type  |
 * +--------+--------+--------+--------+
 * |  hlen  |  plen  |    Operation    |
 * +--------+--------+--------+--------+
 * |       Sender Hardware Addr        |
 * +--------+--------+--------+--------+
 * |   SHA (cont)    |   Sender Proto  |
 * +-----------------+-----------------+
 * |   SPA (cont)    |  Target Hw Addr |
 * +-----------------+-----------------+
 * |        Target Hardware Addr       |
 * +--------+--------+--------+--------+
 * |        Target Protocol Addr       |
 * +-----------------------------------+
 * ```
 *
 * Implements the wire format described in RFC 826 for the common
 * Ethernet/IPv4 case (28 bytes, fixed `hlen=6` / `plen=4`). Hardware
 * addresses are surfaced as raw 6-byte arrays; IPv4 protocol addresses
 * are surfaced as 32-bit numbers.
 *
 * For human-readable conversion use the sister utility packages:
 * - {@link https://jsr.io/@hertzg/mac @hertzg/mac} — `parse` / `stringify`
 * - {@link https://jsr.io/@hertzg/ip @hertzg/ip} — `parseIpv4` / `stringifyIpv4`
 *
 * @example Decode an Ethernet/IPv4 ARP request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 * import { stringify as stringifyMac } from "@hertzg/mac";
 * import {
 *   ARP_HARDWARE_TYPE,
 *   ARP_OPCODE,
 *   ARP_PROTOCOL_TYPE,
 *   arpData,
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
 * const [packet, bytesRead] = arpData().decode(wire);
 *
 * assertEquals(bytesRead, 28);
 * assertEquals(packet.hardwareType, ARP_HARDWARE_TYPE.ETHERNET);
 * assertEquals(packet.protocolType, ARP_PROTOCOL_TYPE.IPV4);
 * assertEquals(packet.operation, ARP_OPCODE.REQUEST);
 * assertEquals(stringifyMac(packet.senderHardwareAddress), "00:11:22:33:44:55");
 * assertEquals(stringifyIpv4(packet.senderProtocolAddress), "192.168.1.1");
 * assertEquals(stringifyIpv4(packet.targetProtocolAddress), "192.168.1.2");
 * ```
 *
 * @module @binstruct/arp
 */

import { bytes, type Coder, struct, u16be, u32be, u8 } from "@hertzg/binstruct";

/** Length of an Ethernet hardware address in bytes. */
export const ARP_HW_LEN_ETHERNET = 6;

/** Length of an IPv4 protocol address in bytes. */
export const ARP_PROTO_LEN_IPV4 = 4;

/** Total wire size of an Ethernet/IPv4 ARP packet, in bytes. */
export const ARP_ETHERNET_IPV4_SIZE = 28;

/**
 * EtherType assigned to ARP (`0x0806`). The value an Ethernet II frame's
 * `etherType` field carries when its payload is an ARP packet.
 */
export const ETHERTYPE_ARP = 0x0806;

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

/** Union of the {@link ARP_HARDWARE_TYPE} values. */
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

/** Union of the {@link ARP_PROTOCOL_TYPE} values. */
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

/** Union of the {@link ARP_OPCODE} values. */
export type ArpOpcode = (typeof ARP_OPCODE)[keyof typeof ARP_OPCODE];

/**
 * Decoded Ethernet/IPv4 ARP packet (RFC 826, 28 bytes).
 *
 * Hardware addresses (`senderHardwareAddress` / `targetHardwareAddress`) are
 * raw 6-byte arrays; IPv4 protocol addresses (`senderProtocolAddress` /
 * `targetProtocolAddress`) are 32-bit unsigned integers. Use `@hertzg/mac`
 * and `@hertzg/ip/ipv4` for human-readable conversion.
 */
export interface ArpData {
  hardwareType: number;
  protocolType: number;
  hardwareAddressLength: number;
  protocolAddressLength: number;
  operation: number;
  senderHardwareAddress: Uint8Array;
  senderProtocolAddress: number;
  targetHardwareAddress: Uint8Array;
  targetProtocolAddress: number;
}

/**
 * Creates a coder for the common Ethernet/IPv4 ARP packet (RFC 826).
 *
 * @returns A coder for {@link ArpData} values.
 *
 * @example Round-trip encode and decode an ARP reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { parse as parseMac } from "@hertzg/mac";
 * import {
 *   ARP_ETHERNET_IPV4_SIZE,
 *   ARP_HARDWARE_TYPE,
 *   ARP_HW_LEN_ETHERNET,
 *   ARP_OPCODE,
 *   ARP_PROTOCOL_TYPE,
 *   ARP_PROTO_LEN_IPV4,
 *   arpData,
 * } from "@binstruct/arp";
 *
 * const coder = arpData();
 * const reply = {
 *   hardwareType: ARP_HARDWARE_TYPE.ETHERNET,
 *   protocolType: ARP_PROTOCOL_TYPE.IPV4,
 *   hardwareAddressLength: ARP_HW_LEN_ETHERNET,
 *   protocolAddressLength: ARP_PROTO_LEN_IPV4,
 *   operation: ARP_OPCODE.REPLY,
 *   senderHardwareAddress: parseMac("aa:bb:cc:dd:ee:ff"),
 *   senderProtocolAddress: parseIpv4("192.168.1.2"),
 *   targetHardwareAddress: parseMac("00:11:22:33:44:55"),
 *   targetProtocolAddress: parseIpv4("192.168.1.1"),
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
export function arpData(): Coder<ArpData> {
  return struct({
    hardwareType: u16be(),
    protocolType: u16be(),
    hardwareAddressLength: u8(),
    protocolAddressLength: u8(),
    operation: u16be(),
    senderHardwareAddress: bytes(ARP_HW_LEN_ETHERNET),
    senderProtocolAddress: u32be(),
    targetHardwareAddress: bytes(ARP_HW_LEN_ETHERNET),
    targetProtocolAddress: u32be(),
  });
}
