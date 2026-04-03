/**
 * Universal IP address classification.
 *
 * This module provides a single {@link classifyIp} function that accepts
 * both IPv4 (`number`) and IPv6 (`bigint`) addresses and returns the
 * appropriate classification with version information.
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
 * const v4 = classifyIp(parseIpv4("192.168.1.1"));
 * assertEquals(v4.version, 4);
 * assertEquals(v4.kind, "private");
 *
 * const v4pub = classifyIp(parseIpv4("8.8.8.8"));
 * assertEquals(v4pub.version, 4);
 * assertEquals(v4pub.kind, "public");
 *
 * // IPv6
 * const v6 = classifyIp(parseIpv6("::1"));
 * assertEquals(v6.version, 6);
 * assertEquals(v6.kind, "loopback");
 *
 * const v6doc = classifyIp(parseIpv6("2001:db8::1"));
 * assertEquals(v6doc.version, 6);
 * assertEquals(v6doc.kind, "documentation");
 * ```
 *
 * @module
 */

import { classifyIpv4 } from "./classifyv4.ts";
import type { ClassifyIpv4Result } from "./classifyv4.ts";
import { classifyIpv6 } from "./classifyv6.ts";
import type { ClassifyIpv6Result } from "./classifyv6.ts";

/**
 * Result of classifying an IP address with version information.
 *
 * Discriminated union on `version`:
 * - `4` — IPv4 classification with `kind` from {@link ClassifyIpv4Result}
 * - `6` — IPv6 classification with `kind` from {@link ClassifyIpv6Result}
 */
export type ClassifyIpResult =
  | { readonly version: 4; readonly kind: ClassifyIpv4Result }
  | { readonly version: 6; readonly kind: ClassifyIpv6Result };

/**
 * Classifies an IPv4 address into its well-known range.
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns An object with `version: 4` and the classification `kind`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const result = classifyIp(parseIpv4("192.168.1.1"));
 * assertEquals(result.version, 4);
 * assertEquals(result.kind, "private");
 * ```
 */
export function classifyIp(
  ip: number,
): { readonly version: 4; readonly kind: ClassifyIpv4Result };
/**
 * Classifies an IPv6 address into its well-known range.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns An object with `version: 6` and the classification `kind`
 */
export function classifyIp(
  ip: bigint,
): { readonly version: 6; readonly kind: ClassifyIpv6Result };
export function classifyIp(
  ip: number | bigint,
): ClassifyIpResult {
  if (typeof ip === "bigint") {
    return { version: 6, kind: classifyIpv6(ip) };
  }
  return { version: 4, kind: classifyIpv4(ip) };
}
