/**
 * IPv4 address and CIDR validation utilities.
 *
 * This module provides non-throwing validity checks for IPv4 addresses
 * and IPv4 CIDR notation strings.
 *
 * For universal validation, see:
 * - [`validate`](https://jsr.io/@hertzg/ip/doc/validate): {@link isValidAddress}, {@link isValidCidr}
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidrv4, isValidAddressv4 } from "@hertzg/ip";
 *
 * assert(isValidAddressv4("192.168.1.1"));
 * assertEquals(isValidAddressv4("::1"), false);
 *
 * assert(isValidCidrv4("10.0.0.0/8"));
 * assertEquals(isValidCidrv4("10.0.0.0/33"), false);
 * ```
 *
 * @module
 */

import { parseAddressv4 } from "./addressv4.ts";
import { parseCidrv4 } from "./cidrv4.ts";

/**
 * Checks if a string is a valid IPv4 address in dotted decimal notation.
 *
 * Accepts exactly what {@link parseAddressv4} accepts: four decimal octets
 * and an optional `%zoneId`, no prefix.
 *
 * @param address The address string to validate
 * @returns `true` if the string is a valid IPv4 address
 *
 * @example Valid addresses
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidAddressv4 } from "@hertzg/ip";
 *
 * assert(isValidAddressv4("0.0.0.0"));
 * assert(isValidAddressv4("192.168.1.1"));
 * assert(isValidAddressv4("255.255.255.255"));
 * assert(isValidAddressv4("192.168.1.1%ether1"));
 * ```
 *
 * @example Invalid addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidAddressv4 } from "@hertzg/ip";
 *
 * assertEquals(isValidAddressv4(""), false);
 * assertEquals(isValidAddressv4("256.0.0.1"), false);
 * assertEquals(isValidAddressv4("1.2.3"), false);
 * assertEquals(isValidAddressv4("01.02.03.04"), false);
 * assertEquals(isValidAddressv4("::1"), false);
 * assertEquals(isValidAddressv4("192.168.1.1%"), false);
 * assertEquals(isValidAddressv4("192.168.1.0/24"), false);
 * ```
 */
export function isValidAddressv4(address: string): boolean {
  try {
    parseAddressv4(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv4 CIDR notation.
 *
 * Accepts exactly what {@link parseCidrv4} accepts: an address, an optional
 * `%zoneId`, then `/` and a prefix length of 0 to 32 or a dotted decimal
 * mask.
 *
 * @param cidr The CIDR string to validate
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
 * assert(isValidCidrv4("10.0.0.0/255.0.0.0"));
 * assert(isValidCidrv4("10.0.0.0%ether1/8"));
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
 * assertEquals(isValidCidrv4("10.0.0.0/ffff:ff00::"), false);
 * assertEquals(isValidCidrv4("10.0.0.0/8%ether1"), false);
 * ```
 */
export function isValidCidrv4(cidr: string): boolean {
  try {
    parseCidrv4(cidr);
    return true;
  } catch {
    return false;
  }
}
