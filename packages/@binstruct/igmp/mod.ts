/**
 * IGMPv2 (RFC 2236) message encoding and decoding.
 *
 * An IGMPv2 message is a fixed 8-byte structure — there is no variable-length
 * trailer:
 *
 * ```text
 *  0      7 8     15 16    23 24    31
 * +--------+--------+--------+--------+
 * |  Type  | MaxResp|    Checksum     |
 * +--------+--------+--------+--------+
 * |            Group Address          |
 * +-----------------------------------+
 * ```
 *
 * `maxResponseTime` is only meaningful on Membership Query messages
 * (`type === IGMP_TYPE.MEMBERSHIP_QUERY`); other message types set it to `0`.
 * `groupAddress` is `0.0.0.0` for a General Query and the multicast group
 * being queried/reported/left otherwise.
 *
 * IPv4 addresses are surfaced as raw 32-bit unsigned integers, mirroring how
 * `@binstruct/ipv4` and `@binstruct/arp` expose the same field. Use
 * {@link https://jsr.io/@hertzg/ip @hertzg/ip}'s `parseAddressv4` / `stringifyAddressv4`
 * for human-readable conversion.
 *
 * Per the binstruct philosophy, encoding does **not** auto-compute the
 * checksum. Use `internetChecksum` from `@binstruct/inet` after encoding
 * (with the checksum field zeroed) to fill it in.
 *
 * This coder covers header-level IGMPv2 messages only — IGMPv1/v3 framing and
 * the variable-length group-record trailer of IGMPv3 are out of scope.
 *
 * @example Round-trip a v2 Membership Report
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IGMP_TYPE, igmpMessage } from "@binstruct/igmp";
 *
 * const coder = igmpMessage();
 * const message = {
 *   type: IGMP_TYPE.V2_MEMBERSHIP_REPORT,
 *   maxResponseTime: 0,
 *   checksum: 0,
 *   groupAddress: 0xe0000001,
 * };
 *
 * const buffer = new Uint8Array(8);
 * const written = coder.encode(message, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, 8);
 * assertEquals(read, 8);
 * assertEquals(decoded, message);
 * ```
 *
 * @module
 */

import { type Coder, struct, u16be, u32be, u8 } from "@hertzg/binstruct";

/**
 * Size in bytes of an IGMPv2 message. IGMPv2 has no variable-length trailer,
 * so every message is exactly this long.
 */
export const IGMP_MESSAGE_SIZE = 8;

/**
 * IP protocol number assigned to IGMP (`2`). The value an IPv4 header's
 * `protocol` field carries when its payload is an IGMP message.
 */
export const IP_PROTOCOL_IGMP = 2;

/**
 * IGMPv2 message type values (RFC 2236 section 2).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IGMP_TYPE } from "@binstruct/igmp";
 *
 * assertEquals(IGMP_TYPE.MEMBERSHIP_QUERY, 0x11);
 * assertEquals(IGMP_TYPE.V2_MEMBERSHIP_REPORT, 0x16);
 * ```
 */
export const IGMP_TYPE = {
  /** Membership Query — General (groupAddress 0.0.0.0) or Group-Specific. */
  MEMBERSHIP_QUERY: 0x11,
  /** Version 1 Membership Report (RFC 1112 compatibility). */
  V1_MEMBERSHIP_REPORT: 0x12,
  /** Version 2 Membership Report. */
  V2_MEMBERSHIP_REPORT: 0x16,
  /** Leave Group. */
  LEAVE_GROUP: 0x17,
} as const;

/**
 * Decoded IGMPv2 message (RFC 2236).
 *
 * @property type            - Message type. See {@linkcode IGMP_TYPE}.
 * @property maxResponseTime - Max Response Time in units of 1/10 second; meaningful only on Membership Query messages, `0` otherwise.
 * @property checksum        - Big-endian 16-bit Internet checksum over the entire 8-byte message with this field set to zero. Not auto-computed on encode; use `internetChecksum` from `@binstruct/inet`.
 * @property groupAddress    - Multicast group as a raw 32-bit unsigned integer, or `0` for a General Query. See {@linkcode https://jsr.io/@hertzg/ip @hertzg/ip} for conversion to/from dotted-quad strings.
 */
export interface IgmpMessage {
  type: number;
  maxResponseTime: number;
  checksum: number;
  groupAddress: number;
}

/**
 * Creates a coder for an IGMPv2 message (RFC 2236) — the fixed 8-byte
 * `type`/`maxResponseTime`/`checksum`/`groupAddress` structure.
 *
 * @returns A coder for {@linkcode IgmpMessage} values.
 *
 * @example Decode a known General Query
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IGMP_TYPE, igmpMessage } from "@binstruct/igmp";
 *
 * // deno-fmt-ignore
 * const wire = new Uint8Array([
 *   0x11, 0x64, 0xee, 0x9b,
 *   0x00, 0x00, 0x00, 0x00,
 * ]);
 *
 * const [decoded, read] = igmpMessage().decode(wire);
 *
 * assertEquals(read, 8);
 * assertEquals(decoded.type, IGMP_TYPE.MEMBERSHIP_QUERY);
 * assertEquals(decoded.maxResponseTime, 100);
 * assertEquals(decoded.checksum, 0xee9b);
 * assertEquals(decoded.groupAddress, 0);
 * ```
 *
 * @example Round-trip a Leave Group message
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { IGMP_MESSAGE_SIZE, IGMP_TYPE, igmpMessage } from "@binstruct/igmp";
 *
 * const coder = igmpMessage();
 * const message = {
 *   type: IGMP_TYPE.LEAVE_GROUP,
 *   maxResponseTime: 0,
 *   checksum: 0x1234,
 *   groupAddress: 0xe0000005,
 * };
 *
 * const buffer = new Uint8Array(IGMP_MESSAGE_SIZE);
 * const written = coder.encode(message, buffer);
 * const [decoded, read] = coder.decode(buffer);
 *
 * assertEquals(written, IGMP_MESSAGE_SIZE);
 * assertEquals(read, IGMP_MESSAGE_SIZE);
 * assertEquals(decoded, message);
 * ```
 */
export function igmpMessage(): Coder<IgmpMessage> {
  return struct({
    type: u8(),
    maxResponseTime: u8(),
    checksum: u16be(),
    groupAddress: u32be(),
  });
}
