/**
 * Universal IP address parsing and stringifying.
 *
 * This module provides {@link parseAddress}, {@link stringifyAddress} and
 * {@link compareAddress} that auto-detect IPv4 vs IPv6 and delegate to the
 * appropriate version-specific function. The {@link Address} type alias is
 * also exported for working with version-polymorphic address values.
 *
 * For version-specific functions, see:
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/addressv4): {@link parseAddressv4}, {@link stringifyAddressv4}, {@link compareAddressv4}
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/addressv6): {@link parseAddressv6}, {@link stringifyAddressv6}, {@link compareAddressv6}
 *
 * @example Parse and stringify any IP address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress, stringifyAddress } from "@hertzg/ip/address";
 *
 * // IPv4
 * const v4 = parseAddress("192.168.1.1");
 * assertEquals(v4, 3232235777);
 * assertEquals(stringifyAddress(v4), "192.168.1.1");
 *
 * // IPv6
 * const v6 = parseAddress("2001:db8::1");
 * assertEquals(v6, 42540766411282592856903984951653826561n);
 * assertEquals(stringifyAddress(v6), "2001:db8::1");
 * ```
 *
 * @module
 */

import { isAddressv6Mapped } from "./classifyv6.ts";
import {
  compareAddressv4,
  parseAddressv4,
  stringifyAddressv4,
} from "./addressv4.ts";
import {
  compareAddressv6,
  parseAddressv6,
  stringifyAddressv6,
  unmapToAddressv4,
} from "./addressv6.ts";

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
 * {@link parseAddressv6} directly instead.
 *
 * @param address The address string in dotted decimal or colon-hexadecimal notation
 * @returns The parsed address as `number` (IPv4) or `bigint` (IPv6)
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If values are out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(parseAddress("10.0.0.1"), 167772161);
 * assertEquals(parseAddress("::1"), 1n);
 * assertEquals(parseAddress("::ffff:192.168.1.1"), 3232235777);
 * ```
 */
export function parseAddress(address: string): Address {
  if (address.includes(":")) {
    const ipv6 = parseAddressv6(address);
    if (isAddressv6Mapped(ipv6)) {
      return unmapToAddressv4(ipv6);
    }
    return ipv6;
  }
  return parseAddressv4(address);
}

/**
 * Stringifies an IPv4 (`number`) or IPv6 (`bigint`) address to its
 * standard notation.
 *
 * IPv4 addresses (numbers) are always stringified as dotted decimal.
 * Since {@link parseAddress} unwraps IPv4-mapped IPv6 addresses to numbers,
 * round-tripping a mapped address through `parseAddress`/`stringifyAddress`
 * produces the IPv4 form (e.g. `"192.168.1.1"`, not `"::ffff:c0a8:101"`).
 *
 * To produce the mapped IPv6 representation, use {@link mapFromAddressv4}
 * with {@link stringifyAddressv6}:
 *
 * @param address The address as a `number` (IPv4) or `bigint` (IPv6)
 * @returns The address string in dotted decimal or compressed colon-hexadecimal notation
 * @throws {RangeError} If the address is out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * assertEquals(stringifyAddress(167772161), "10.0.0.1");
 * assertEquals(stringifyAddress(1n), "::1");
 * ```
 *
 * @example Producing the mapped IPv6 representation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress, stringifyAddress } from "@hertzg/ip/address";
 * import { mapFromAddressv4, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const ip = parseAddress("::ffff:192.168.1.1");
 * assertEquals(stringifyAddress(ip), "192.168.1.1");
 * assertEquals(stringifyAddressv6(mapFromAddressv4(ip as number)), "::ffff:c0a8:101");
 * ```
 */
export function stringifyAddress(address: number): string;
/** Stringifies an IPv6 (`bigint`) address to compressed colon-hexadecimal notation. */
export function stringifyAddress(address: bigint): string;
/** Stringifies an IPv4 or IPv6 address to its standard notation. */
export function stringifyAddress(address: Address): string;
/** Stringifies an IPv4 or IPv6 address to its standard notation. */
export function stringifyAddress(address: Address): string {
  if (typeof address === "bigint") {
    return stringifyAddressv6(address);
  }
  return stringifyAddressv4(address);
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
 * {@link parseAddress} already unwraps mapped addresses to their IPv4 `number`
 * form, so a mapped `bigint` only reaches this function via
 * {@link parseAddressv6}.
 *
 * @param a The first address
 * @param b The second address
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort a mixed dual-stack list, ascending or descending
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddress, parseAddress, stringifyAddress } from "@hertzg/ip/address";
 *
 * const clients = ["2001:db8::1", "10.0.0.2", "::1", "10.0.0.1"].map(parseAddress);
 *
 * assertEquals(clients.toSorted(compareAddress).map(stringifyAddress), [
 *   "10.0.0.1",
 *   "10.0.0.2",
 *   "::1",
 *   "2001:db8::1",
 * ]);
 *
 * // Descending: swap the arguments
 * assertEquals(clients.toSorted((a, b) => compareAddress(b, a)).map(stringifyAddress), [
 *   "2001:db8::1",
 *   "::1",
 *   "10.0.0.2",
 *   "10.0.0.1",
 * ]);
 * ```
 *
 * @example Every IPv4 address sorts before every IPv6 address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddress, parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(compareAddress(parseAddress("255.255.255.255"), parseAddress("::")), -1);
 * assertEquals(compareAddress(parseAddress("::"), parseAddress("0.0.0.0")), 1);
 * ```
 *
 * @example An IPv4-mapped bigint is an IPv6 value, not its IPv4 twin
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddress } from "@hertzg/ip/address";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const mapped = parseAddressv6("::ffff:10.0.0.1");
 * const plain = parseAddressv4("10.0.0.1");
 *
 * assertEquals(compareAddress(mapped, plain), 1);
 * ```
 */
export function compareAddress(a: Address, b: Address): -1 | 0 | 1 {
  if (typeof a === "number") {
    return typeof b === "number" ? compareAddressv4(a, b) : -1;
  }
  return typeof b === "bigint" ? compareAddressv6(a, b) : 1;
}
