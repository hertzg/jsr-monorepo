/**
 * Universal IP address parsing and stringifying.
 *
 * This module provides {@link parseIp} and {@link stringifyIp} that
 * auto-detect IPv4 vs IPv6 and delegate to the appropriate version-specific
 * function.
 *
 * For version-specific functions, see:
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/ipv4): {@link parseIpv4}, {@link stringifyIpv4}
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/ipv6): {@link parseIpv6}, {@link stringifyIpv6}
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

import { ipv4From64Mapped } from "./4to6.ts";
import { isIpv6Ipv4Mapped } from "./classifyv6.ts";
import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";
import { parseIpv6, stringifyIpv6 } from "./ipv6.ts";

/**
 * Parses an IPv4 or IPv6 address string to its numeric representation.
 *
 * Detects the IP version by checking for `:` in the input — if present,
 * the address is parsed as IPv6 (returning `bigint`), otherwise as IPv4
 * (returning `number`). IPv4-mapped IPv6 addresses (`::ffff:x.x.x.x`) are
 * automatically unwrapped to their IPv4 number representation.
 *
 * To preserve the full IPv6 bigint for mapped addresses, use
 * {@link parseIpv6} directly instead.
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
 * assertEquals(parseIp("::ffff:192.168.1.1"), 3232235777);
 * ```
 */
export function parseIp(ip: string): number | bigint {
  if (ip.includes(":")) {
    const ipv6 = parseIpv6(ip);
    if (isIpv6Ipv4Mapped(ipv6)) {
      return ipv4From64Mapped(ipv6);
    }
    return ipv6;
  }
  return parseIpv4(ip);
}

/**
 * Stringifies an IPv4 (`number`) or IPv6 (`bigint`) address to its
 * standard notation.
 *
 * IPv4 addresses (numbers) are always stringified as dotted decimal.
 * Since {@link parseIp} unwraps IPv4-mapped IPv6 addresses to numbers,
 * round-tripping a mapped address through `parseIp`/`stringifyIp`
 * produces the IPv4 form (e.g. `"192.168.1.1"`, not `"::ffff:c0a8:101"`).
 *
 * To produce the mapped IPv6 representation, use {@link ipv4To64Mapped}
 * with {@link stringifyIpv6}:
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
 *
 * @example Producing the mapped IPv6 representation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIp, stringifyIp } from "@hertzg/ip/ip";
 * import { ipv4To64Mapped } from "@hertzg/ip/4to6";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const ip = parseIp("::ffff:192.168.1.1");
 * assertEquals(stringifyIp(ip), "192.168.1.1");
 * assertEquals(stringifyIpv6(ipv4To64Mapped(ip as number)), "::ffff:c0a8:101");
 * ```
 */
export function stringifyIp(ip: number): string;
/** Stringifies an IPv6 (`bigint`) address to compressed colon-hexadecimal notation. */
export function stringifyIp(ip: bigint): string;
/** Stringifies an IPv4 or IPv6 address to its standard notation. */
export function stringifyIp(ip: number | bigint): string;
export function stringifyIp(ip: number | bigint): string {
  if (typeof ip === "bigint") {
    return stringifyIpv6(ip);
  }
  return stringifyIpv4(ip);
}
