/**
 * Universal CIDR notation parsing, stringifying, and validation.
 *
 * This module provides {@link parseCidr}, {@link stringifyCidr}, and
 * {@link isValidCidr} that auto-detect IPv4 vs IPv6 and delegate to
 * the appropriate version-specific function.
 *
 * For version-specific functions, see:
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): {@link parseCidrv4}, {@link stringifyCidrv4}, {@link isValidCidrv4}
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): {@link parseCidr6}, {@link stringifyCidr6}, {@link isValidCidr6}
 *
 * @example Parse and stringify any CIDR block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * // IPv4
 * const v4 = parseCidr("192.168.1.0/24");
 * assertEquals(v4.prefixLength, 24);
 * assertEquals(stringifyCidr(v4), "192.168.1.0/24");
 *
 * // IPv6
 * const v6 = parseCidr("2001:db8::/32");
 * assertEquals(v6.prefixLength, 32);
 * assertEquals(stringifyCidr(v6), "2001:db8::/32");
 * ```
 *
 * @module
 */

import {
  type Cidrv4,
  isValidCidrv4,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";
import {
  type Cidr6,
  isValidCidr6,
  parseCidr6,
  stringifyCidr6,
} from "./cidrv6.ts";

/**
 * Parses an IPv4 or IPv6 CIDR notation string.
 *
 * Detects the IP version by checking for `:` in the input — if present,
 * the CIDR is parsed as IPv6 (returning {@link Cidr6}), otherwise as IPv4
 * (returning {@link Cidrv4}).
 *
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24" or "2001:db8::/32")
 * @returns The parsed CIDR as `Cidrv4` or `Cidr6`
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If values are out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr } from "@hertzg/ip/cidr";
 *
 * const v4 = parseCidr("10.0.0.0/8");
 * assertEquals(v4.prefixLength, 8);
 *
 * const v6 = parseCidr("fe80::/10");
 * assertEquals(v6.prefixLength, 10);
 * ```
 */
export function parseCidr(cidr: string): Cidrv4 | Cidr6 {
  if (cidr.includes(":")) {
    return parseCidr6(cidr);
  }
  return parseCidrv4(cidr);
}

/**
 * Stringifies a {@link Cidrv4} or {@link Cidr6} to CIDR notation.
 *
 * @param cidr The CIDR object
 * @returns The CIDR notation string
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(stringifyCidr(parseCidr("192.168.1.0/24")), "192.168.1.0/24");
 * assertEquals(stringifyCidr(parseCidr("2001:db8::/32")), "2001:db8::/32");
 * ```
 */
export function stringifyCidr(cidr: Cidrv4): string;
/** Stringifies a {@link Cidr6} to IPv6 CIDR notation. */
export function stringifyCidr(cidr: Cidr6): string;
/** Stringifies a {@link Cidrv4} or {@link Cidr6} to CIDR notation. */
export function stringifyCidr(cidr: Cidrv4 | Cidr6): string;
export function stringifyCidr(cidr: Cidrv4 | Cidr6): string {
  if (typeof cidr.address === "bigint") {
    return stringifyCidr6(cidr as Cidr6);
  }
  return stringifyCidrv4(cidr as Cidrv4);
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
 * import { isValidCidr } from "@hertzg/ip/cidr";
 *
 * assert(isValidCidr("10.0.0.0/8"));
 * assert(isValidCidr("2001:db8::/32"));
 * assertEquals(isValidCidr("10.0.0.0"), false);
 * assertEquals(isValidCidr("garbage/24"), false);
 * ```
 */
export function isValidCidr(s: string): boolean {
  return isValidCidrv4(s) || isValidCidr6(s);
}
