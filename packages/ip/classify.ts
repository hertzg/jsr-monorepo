/**
 * Universal IP address classification.
 *
 * This module provides a single {@link classifyIp} function that accepts
 * both IPv4 (`number`) and IPv6 (`bigint`) addresses and returns the
 * appropriate classification label.
 *
 * For version-specific classifiers, see:
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): {@link classifyIpv4}, {@link isIpv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): {@link classifyIpv6}, {@link isIpv6Loopback}, etc.
 *
 * @example Classify any IP address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * // IPv4
 * assertEquals(classifyIp(parseIpv4("192.168.1.1")), "private");
 * assertEquals(classifyIp(parseIpv4("8.8.8.8")), "public");
 * assertEquals(classifyIp(parseIpv4("127.0.0.1")), "loopback");
 *
 * // IPv6
 * assertEquals(classifyIp(parseIpv6("::1")), "loopback");
 * assertEquals(classifyIp(parseIpv6("2001:db8::1")), "documentation");
 * assertEquals(classifyIp(parseIpv6("fe80::1")), "link-local");
 * ```
 *
 * @module
 */

import { classifyIpv4 } from "./classifyv4.ts";
import type { Ipv4Classification } from "./classifyv4.ts";
import { classifyIpv6 } from "./classifyv6.ts";
import type { Ipv6Classification } from "./classifyv6.ts";

/**
 * Union of all possible classification labels for both IPv4 and IPv6.
 */
export type IpClassification = Ipv4Classification | Ipv6Classification;

/**
 * Classifies an IPv4 address into its well-known range.
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns The classification label
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(classifyIp(parseIpv4("192.168.1.1")), "private");
 * assertEquals(classifyIp(parseIpv4("8.8.8.8")), "public");
 * ```
 */
export function classifyIp(ip: number): Ipv4Classification;
/** Classifies an IPv6 (`bigint`) address into its well-known range. */
export function classifyIp(ip: bigint): Ipv6Classification;
export function classifyIp(
  ip: number | bigint,
): Ipv4Classification | Ipv6Classification {
  if (typeof ip === "bigint") {
    return classifyIpv6(ip);
  }
  return classifyIpv4(ip);
}
