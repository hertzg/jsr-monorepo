/**
 * IPv6 address and CIDR validation utilities.
 *
 * This module provides non-throwing validation functions for IPv6 addresses
 * and IPv6 CIDR notation.
 *
 * @example Check if strings are valid IPv6
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidr6, isValidIpv6 } from "@hertzg/ip/validatev6";
 *
 * assert(isValidIpv6("2001:db8::1"));
 * assertEquals(isValidIpv6("not:an:address"), false);
 *
 * assert(isValidCidr6("2001:db8::/32"));
 * assertEquals(isValidCidr6("2001:db8::/129"), false);
 * ```
 *
 * @module
 */

import { parseIpv6 } from "./ipv6.ts";
import { parseCidr6 } from "./cidrv6.ts";

/**
 * Checks if a string is a valid IPv6 address in colon-hexadecimal notation.
 *
 * Accepts full form, compressed form with `::`, IPv4-mapped addresses
 * (`::ffff:192.168.1.1`), and addresses with zone IDs (`fe80::1%eth0`).
 *
 * @param s The string to validate
 * @returns `true` if the string is a valid IPv6 address
 *
 * @example Valid addresses
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidIpv6 } from "@hertzg/ip/validatev6";
 *
 * assert(isValidIpv6("::"));
 * assert(isValidIpv6("::1"));
 * assert(isValidIpv6("2001:db8::1"));
 * assert(isValidIpv6("::ffff:192.168.1.1"));
 * assert(isValidIpv6("fe80::1%eth0"));
 * ```
 *
 * @example Invalid addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIpv6 } from "@hertzg/ip/validatev6";
 *
 * assertEquals(isValidIpv6(""), false);
 * assertEquals(isValidIpv6("192.168.1.1"), false);
 * assertEquals(isValidIpv6("2001:db8:::1"), false);
 * assertEquals(isValidIpv6("gggg::1"), false);
 * ```
 */
export function isValidIpv6(s: string): boolean {
  try {
    parseIpv6(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv6 CIDR notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is valid IPv6 CIDR notation
 *
 * @example Valid CIDR
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidCidr6 } from "@hertzg/ip/validatev6";
 *
 * assert(isValidCidr6("::/0"));
 * assert(isValidCidr6("2001:db8::/32"));
 * assert(isValidCidr6("::1/128"));
 * ```
 *
 * @example Invalid CIDR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidCidr6 } from "@hertzg/ip/validatev6";
 *
 * assertEquals(isValidCidr6(""), false);
 * assertEquals(isValidCidr6("2001:db8::1"), false);
 * assertEquals(isValidCidr6("2001:db8::/129"), false);
 * assertEquals(isValidCidr6("192.168.1.0/24"), false);
 * ```
 */
export function isValidCidr6(s: string): boolean {
  try {
    parseCidr6(s);
    return true;
  } catch {
    return false;
  }
}
