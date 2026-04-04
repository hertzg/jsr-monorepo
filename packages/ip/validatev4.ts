/**
 * IPv4 address and CIDR validation utilities.
 *
 * This module provides non-throwing validity checks for IPv4 addresses
 * and IPv4 CIDR notation strings.
 *
 * For universal validation, see:
 * - [`validate`](https://jsr.io/@hertzg/ip/doc/validate): {@link isValidIp}, {@link validateIp}
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidrv4, isValidIpv4 } from "@hertzg/ip";
 *
 * assert(isValidIpv4("192.168.1.1"));
 * assertEquals(isValidIpv4("::1"), false);
 *
 * assert(isValidCidrv4("10.0.0.0/8"));
 * assertEquals(isValidCidrv4("10.0.0.0/33"), false);
 * ```
 *
 * @module
 */

import { parseIpv4 } from "./ipv4.ts";
import { parseCidrv4 } from "./cidrv4.ts";

/**
 * Checks if a string is a valid IPv4 address in dotted decimal notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is a valid IPv4 address
 *
 * @example Valid addresses
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidIpv4 } from "@hertzg/ip";
 *
 * assert(isValidIpv4("0.0.0.0"));
 * assert(isValidIpv4("192.168.1.1"));
 * assert(isValidIpv4("255.255.255.255"));
 * ```
 *
 * @example Invalid addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIpv4 } from "@hertzg/ip";
 *
 * assertEquals(isValidIpv4(""), false);
 * assertEquals(isValidIpv4("256.0.0.1"), false);
 * assertEquals(isValidIpv4("1.2.3"), false);
 * assertEquals(isValidIpv4("01.02.03.04"), false);
 * assertEquals(isValidIpv4("::1"), false);
 * ```
 */
export function isValidIpv4(s: string): boolean {
  try {
    parseIpv4(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv4 CIDR notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is valid IPv4 CIDR notation
 *
 * @example Valid CIDR
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidCidrv4 } from "@hertzg/ip";
 *
 * assert(isValidCidrv4("0.0.0.0/0"));
 * assert(isValidCidrv4("192.168.1.0/24"));
 * assert(isValidCidrv4("10.0.0.1/32"));
 * ```
 *
 * @example Invalid CIDR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidCidrv4 } from "@hertzg/ip";
 *
 * assertEquals(isValidCidrv4(""), false);
 * assertEquals(isValidCidrv4("192.168.1.0"), false);
 * assertEquals(isValidCidrv4("192.168.1.0/33"), false);
 * assertEquals(isValidCidrv4("192.168.1.0/-1"), false);
 * assertEquals(isValidCidrv4("2001:db8::/32"), false);
 * ```
 */
export function isValidCidrv4(s: string): boolean {
  try {
    parseCidrv4(s);
    return true;
  } catch {
    return false;
  }
}
