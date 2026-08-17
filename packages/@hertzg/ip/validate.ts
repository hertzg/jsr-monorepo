/**
 * Universal IP address and CIDR validation utilities.
 *
 * This module provides {@link isValidAddress} to check if a string is a valid
 * plain IP address (IPv4 or IPv6), and {@link isValidCidr} to check if a
 * string is valid CIDR notation.
 *
 * For version-specific validators, see:
 * - [`validatev4`](https://jsr.io/@hertzg/ip/doc/validatev4): {@link isValidAddressv4}, {@link isValidCidrv4}
 * - [`validatev6`](https://jsr.io/@hertzg/ip/doc/validatev6): {@link isValidAddressv6}, {@link isValidCidrv6}
 *
 * @example Universal validation
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidr, isValidAddress } from "@hertzg/ip/validate";
 *
 * assert(isValidAddress("192.168.1.1"));
 * assert(isValidAddress("::1"));
 * assertEquals(isValidAddress("10.0.0.0/8"), false);
 * assertEquals(isValidAddress("garbage"), false);
 *
 * assert(isValidCidr("10.0.0.0/8"));
 * assert(isValidCidr("2001:db8::/32"));
 * assertEquals(isValidCidr("192.168.1.1"), false);
 * ```
 *
 * @module
 */

import { parseAddress } from "./address.ts";
import { parseCidr } from "./cidr.ts";

/**
 * Checks if a string is a valid plain IP address (IPv4 or IPv6).
 *
 * Accepts exactly what {@link parseAddress} accepts, an optional `%zoneId`
 * included. Does **not** accept CIDR notation — use {@link isValidCidr} for
 * that.
 *
 * @param address The address string to validate
 * @returns `true` if the string is a valid IPv4 or IPv6 address
 *
 * @example Valid inputs
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidAddress } from "@hertzg/ip/validate";
 *
 * assert(isValidAddress("192.168.1.1"));
 * assert(isValidAddress("::1"));
 * assert(isValidAddress("0.0.0.0"));
 * assert(isValidAddress("fe80::1%eth0"));
 * assert(isValidAddress("192.168.1.1%ether1"));
 * ```
 *
 * @example Invalid inputs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidAddress } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidAddress(""), false);
 * assertEquals(isValidAddress("not an ip"), false);
 * assertEquals(isValidAddress("999.999.999.999"), false);
 * assertEquals(isValidAddress("10.0.0.0/8"), false);
 * assertEquals(isValidAddress("2001:db8::/32"), false);
 * assertEquals(isValidAddress("fe80::1%"), false);
 * ```
 */
export function isValidAddress(address: string): boolean {
  try {
    parseAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv4 or IPv6 CIDR notation.
 *
 * Accepts exactly what {@link parseCidr} accepts: either dialect (`/8` or
 * `/255.0.0.0`) and an optional `%zoneId` before the slash.
 *
 * @param cidr The CIDR string to validate
 * @returns `true` if the string is valid CIDR notation
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidCidr } from "@hertzg/ip/validate";
 *
 * assert(isValidCidr("10.0.0.0/8"));
 * assert(isValidCidr("2001:db8::/32"));
 * assert(isValidCidr("10.0.0.0/255.0.0.0"));
 * assert(isValidCidr("fe80::%ether1/64"));
 * assertEquals(isValidCidr("10.0.0.0"), false);
 * assertEquals(isValidCidr("garbage/24"), false);
 * assertEquals(isValidCidr("10.0.0.0/ffff:ff00::"), false);
 * ```
 */
export function isValidCidr(cidr: string): boolean {
  try {
    parseCidr(cidr);
    return true;
  } catch {
    return false;
  }
}
