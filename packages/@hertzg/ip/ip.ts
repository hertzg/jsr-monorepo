/**
 * Universal IP address parsing and stringifying.
 *
 * This module provides {@link parseIp}, {@link stringifyIp} and
 * {@link compareIp} that auto-detect IPv4 vs IPv6 and delegate to the
 * appropriate version-specific function. The {@link Address} type alias is
 * also exported for working with version-polymorphic address values.
 *
 * For version-specific functions, see:
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/ipv4): {@link parseIpv4}, {@link stringifyIpv4}, {@link compareIpv4}
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/ipv6): {@link parseIpv6}, {@link stringifyIpv6}, {@link compareIpv6}
 *
 * @example Sort a mixed list of addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareIp, parseIp, stringifyIp } from "@hertzg/ip/ip";
 *
 * const addresses = ["2001:db8::1", "10.0.0.2", "10.0.0.1"].map(parseIp);
 *
 * assertEquals(addresses.toSorted(compareIp).map(stringifyIp), [
 *   "10.0.0.1",
 *   "10.0.0.2",
 *   "2001:db8::1",
 * ]);
 * ```
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
import { compareIpv4, parseIpv4, stringifyIpv4 } from "./ipv4.ts";
import { compareIpv6, parseIpv6, stringifyIpv6 } from "./ipv6.ts";

/**
 * A plain IP address of either IP version.
 *
 * This is a union of `number` (IPv4, 32-bit) and `bigint` (IPv6, 128-bit) —
 * the JS primitive type is what carries the version. Useful for functions
 * that operate on addresses regardless of IP version; narrow with a
 * `typeof` check.
 */
export type Address = number | bigint;

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
 * @param address The address string in dotted decimal or colon-hexadecimal notation
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
export function parseIp(address: string): Address {
  if (address.includes(":")) {
    const ipv6 = parseIpv6(address);
    if (isIpv6Ipv4Mapped(ipv6)) {
      return ipv4From64Mapped(ipv6);
    }
    return ipv6;
  }
  return parseIpv4(address);
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
 * @param address The address as a `number` (IPv4) or `bigint` (IPv6)
 * @returns The address string in dotted decimal or compressed colon-hexadecimal notation
 * @throws {RangeError} If the address is out of range
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
export function stringifyIp(address: number): string;
/** Stringifies an IPv6 (`bigint`) address to compressed colon-hexadecimal notation. */
export function stringifyIp(address: bigint): string;
/** Stringifies an IPv4 or IPv6 address to its standard notation. */
export function stringifyIp(address: Address): string;
/** Stringifies an IPv4 or IPv6 address to its standard notation. */
export function stringifyIp(address: Address): string {
  if (typeof address === "bigint") {
    return stringifyIpv6(address);
  }
  return stringifyIpv4(address);
}

/**
 * Compares two IP addresses of either version for sorting.
 *
 * The order is **version-first and total**: every IPv4 address (`number`)
 * sorts before every IPv6 address (`bigint`), and within a version
 * addresses sort numerically ascending. Mixed-version arguments are not an
 * error — unlike the universal CIDR operations, this function never throws,
 * because sorting a mixed dual-stack list is the reason it exists. Go's
 * `net/netip`, Rust's `std::net::IpAddr` and PostgreSQL's `inet` all order
 * addresses the same way.
 *
 * Note that "IPv4 sorts first" is a statement about order, not about
 * magnitude: the two address spaces are disjoint and nothing is converted
 * between them. An IPv4-mapped address held as a `bigint` is an IPv6 value
 * and sorts in the IPv6 half — see the example below. In practice
 * {@link parseIp} already unwraps mapped addresses to their IPv4 `number`
 * form, so a mapped `bigint` only reaches this function via
 * {@link parseIpv6}.
 *
 * @param a The first address
 * @param b The second address
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort a mixed dual-stack list
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareIp, parseIp, stringifyIp } from "@hertzg/ip/ip";
 *
 * const clients = ["2001:db8::1", "10.0.0.2", "::1", "10.0.0.1"].map(parseIp);
 *
 * assertEquals(clients.toSorted(compareIp).map(stringifyIp), [
 *   "10.0.0.1",
 *   "10.0.0.2",
 *   "::1",
 *   "2001:db8::1",
 * ]);
 * ```
 *
 * @example Every IPv4 address sorts before every IPv6 address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareIp, parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(compareIp(parseIp("255.255.255.255"), parseIp("::")), -1);
 * assertEquals(compareIp(parseIp("::"), parseIp("0.0.0.0")), 1);
 * ```
 *
 * @example An IPv4-mapped bigint is an IPv6 value, not its IPv4 twin
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareIp } from "@hertzg/ip/ip";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const mapped = parseIpv6("::ffff:10.0.0.1");
 * const plain = parseIpv4("10.0.0.1");
 *
 * assertEquals(compareIp(mapped, plain), 1);
 * ```
 */
export function compareIp(a: Address, b: Address): -1 | 0 | 1 {
  if (typeof a === "number") {
    return typeof b === "number" ? compareIpv4(a, b) : -1;
  }
  return typeof b === "bigint" ? compareIpv6(a, b) : 1;
}
