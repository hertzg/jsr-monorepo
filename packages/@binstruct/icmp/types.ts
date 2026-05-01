/**
 * ICMPv4 type and code constants from the IANA registry.
 *
 * Only the most common values are listed; arbitrary numeric values are
 * acceptable wherever a `type` or `code` is expected.
 *
 * @module
 */

/**
 * Common ICMPv4 type values (RFC 792 and successors).
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ICMP_TYPE } from "@binstruct/icmp";
 *
 * assertEquals(ICMP_TYPE.ECHO_REQUEST, 8);
 * assertEquals(ICMP_TYPE.ECHO_REPLY, 0);
 * ```
 */
export const ICMP_TYPE = {
  /** Echo Reply (RFC 792) */
  ECHO_REPLY: 0,
  /** Destination Unreachable (RFC 792) */
  DEST_UNREACH: 3,
  /** Source Quench (deprecated by RFC 6633) */
  SOURCE_QUENCH: 4,
  /** Redirect (RFC 792) */
  REDIRECT: 5,
  /** Echo Request (RFC 792) */
  ECHO_REQUEST: 8,
  /** Router Advertisement (RFC 1256) */
  ROUTER_ADVERTISEMENT: 9,
  /** Router Solicitation (RFC 1256) */
  ROUTER_SOLICITATION: 10,
  /** Time Exceeded (RFC 792) */
  TIME_EXCEEDED: 11,
  /** Parameter Problem (RFC 792) */
  PARAMETER_PROBLEM: 12,
  /** Timestamp Request (RFC 792) */
  TIMESTAMP: 13,
  /** Timestamp Reply (RFC 792) */
  TIMESTAMP_REPLY: 14,
} as const;

/**
 * Numeric value of an {@link ICMP_TYPE} entry. Plain `number` is also accepted
 * by all coders so unknown types decode without loss.
 */
export type IcmpType = typeof ICMP_TYPE[keyof typeof ICMP_TYPE];
