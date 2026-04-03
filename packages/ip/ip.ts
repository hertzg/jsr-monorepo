/**
 * Universal IP address parsing and stringifying.
 *
 * This module provides {@link parseIp} and {@link stringifyIp} that
 * auto-detect IPv4 vs IPv6 and delegate to the appropriate version-specific
 * function.
 *
 * @example Parse and stringify any IP address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIp, stringifyIp } from "@hertzg/ip/ip";
 *
 * // IPv4
 * const v4 = parseIp("192.168.1.1");
 * assertEquals(v4, 3232235777);
 * assertEquals(stringifyIp(v4), "192.168.1.1");
 *
 * // IPv6
 * const v6 = parseIp("2001:db8::1");
 * assertEquals(v6, 42540766411282592856903984951653826561n);
 * assertEquals(stringifyIp(v6), "2001:db8::1");
 * ```
 *
 * @module
 */

import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";
import { parseIpv6, stringifyIpv6 } from "./ipv6.ts";

/**
 * Parses an IPv4 or IPv6 address string to its numeric representation.
 *
 * Detects the IP version by checking for `:` in the input — if present,
 * the address is parsed as IPv6 (returning `bigint`), otherwise as IPv4
 * (returning `number`).
 *
 * @param ip The IP address string in dotted decimal or colon-hexadecimal notation
 * @returns The parsed address as `number` (IPv4) or `bigint` (IPv6)
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If values are out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(parseIp("10.0.0.1"), 167772161);
 * assertEquals(parseIp("::1"), 1n);
 * assertEquals(parseIp("::ffff:192.168.1.1"), 0xFFFF_C0A8_0101n);
 * ```
 */
export function parseIp(ip: string): number | bigint {
  if (ip.includes(":")) {
    return parseIpv6(ip);
  }
  return parseIpv4(ip);
}

/**
 * Stringifies an IPv4 (`number`) or IPv6 (`bigint`) address to its
 * standard notation.
 *
 * @param ip The IP address as `number` (IPv4) or `bigint` (IPv6)
 * @returns The address string in dotted decimal or compressed colon-hexadecimal notation
 * @throws {RangeError} If the value is out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIp } from "@hertzg/ip/ip";
 *
 * assertEquals(stringifyIp(167772161), "10.0.0.1");
 * assertEquals(stringifyIp(1n), "::1");
 * ```
 */
export function stringifyIp(ip: number): string;
/** Stringifies an IPv6 address (`bigint`) to compressed colon-hexadecimal notation. */
export function stringifyIp(ip: bigint): string;
export function stringifyIp(ip: number | bigint): string {
  if (typeof ip === "bigint") {
    return stringifyIpv6(ip);
  }
  return stringifyIpv4(ip);
}
