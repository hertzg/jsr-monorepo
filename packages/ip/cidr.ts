/**
 * Universal CIDR notation parsing and stringifying.
 *
 * This module provides {@link parseCidr} and {@link stringifyCidr} that
 * auto-detect IPv4 vs IPv6 and delegate to the appropriate version-specific
 * function.
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

import { type Cidr4, parseCidr4, stringifyCidr4 } from "./cidrv4.ts";
import { type Cidr6, parseCidr6, stringifyCidr6 } from "./cidrv6.ts";

/**
 * Parses an IPv4 or IPv6 CIDR notation string.
 *
 * Detects the IP version by checking for `:` in the input — if present,
 * the CIDR is parsed as IPv6 (returning {@link Cidr6}), otherwise as IPv4
 * (returning {@link Cidr4}).
 *
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24" or "2001:db8::/32")
 * @returns The parsed CIDR as `Cidr4` or `Cidr6`
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
export function parseCidr(cidr: string): Cidr4 | Cidr6 {
  if (cidr.includes(":")) {
    return parseCidr6(cidr);
  }
  return parseCidr4(cidr);
}

/**
 * Stringifies a {@link Cidr4} or {@link Cidr6} to CIDR notation.
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
export function stringifyCidr(cidr: Cidr4): string;
/** Stringifies a {@link Cidr6} to IPv6 CIDR notation. */
export function stringifyCidr(cidr: Cidr6): string;
export function stringifyCidr(cidr: Cidr4 | Cidr6): string {
  if (typeof cidr.address === "bigint") {
    return stringifyCidr6(cidr as Cidr6);
  }
  return stringifyCidr4(cidr as Cidr4);
}
