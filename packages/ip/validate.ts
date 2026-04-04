/**
 * Universal IP address and CIDR validation utilities.
 *
 * This module provides {@link isValidIp} to check if a string is a valid
 * plain IP address (IPv4 or IPv6), and {@link isValidCidr} to check if a
 * string is valid CIDR notation.
 *
 * For version-specific validators, see:
 * - [`validatev4`](https://jsr.io/@hertzg/ip/doc/validatev4): {@link isValidIpv4}, {@link isValidCidrv4}
 * - [`validatev6`](https://jsr.io/@hertzg/ip/doc/validatev6): {@link isValidIpv6}, {@link isValidCidrv6}
 *
 * @example Universal validation
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidr, isValidIp } from "@hertzg/ip/validate";
 *
 * assert(isValidIp("192.168.1.1"));
 * assert(isValidIp("::1"));
 * assertEquals(isValidIp("10.0.0.0/8"), false);
 * assertEquals(isValidIp("garbage"), false);
 *
 * assert(isValidCidr("10.0.0.0/8"));
 * assert(isValidCidr("2001:db8::/32"));
 * assertEquals(isValidCidr("192.168.1.1"), false);
 * ```
 *
 * @module
 */

import { parseIp } from "./ip.ts";
import { isValidCidrv4 } from "./validatev4.ts";
import { isValidCidrv6 } from "./validatev6.ts";

/**
 * Checks if a string is a valid plain IP address (IPv4 or IPv6).
 *
 * Does **not** accept CIDR notation — use {@link isValidCidr} for that.
 *
 * @param s The string to validate
 * @returns `true` if the string is a valid IPv4 or IPv6 address
 *
 * @example Valid inputs
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidIp } from "@hertzg/ip/validate";
 *
 * assert(isValidIp("192.168.1.1"));
 * assert(isValidIp("::1"));
 * assert(isValidIp("0.0.0.0"));
 * assert(isValidIp("fe80::1%eth0"));
 * ```
 *
 * @example Invalid inputs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIp } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidIp(""), false);
 * assertEquals(isValidIp("not an ip"), false);
 * assertEquals(isValidIp("999.999.999.999"), false);
 * assertEquals(isValidIp("10.0.0.0/8"), false);
 * assertEquals(isValidIp("2001:db8::/32"), false);
 * ```
 */
export function isValidIp(s: string): boolean {
  try {
    parseIp(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv4 or IPv6 CIDR notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is valid CIDR notation
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidr } from "@hertzg/ip/validate";
 *
 * assert(isValidCidr("10.0.0.0/8"));
 * assert(isValidCidr("2001:db8::/32"));
 * assertEquals(isValidCidr("10.0.0.0"), false);
 * assertEquals(isValidCidr("garbage/24"), false);
 * ```
 */
export function isValidCidr(s: string): boolean {
  return isValidCidrv4(s) || isValidCidrv6(s);
}
