/**
 * IPv6 CIDR notation parsing and utilities.
 *
 * This module provides CIDR parsing, network calculations, and IP range
 * checking for IPv6 networks. Works with bigint representations to enable
 * efficient IP assignment workflows.
 *
 * @example CIDR operations
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import {
 *   cidr6Contains,
 *   cidr6FirstAddress,
 *   cidr6LastAddress,
 *   parseCidr6,
 * } from "@hertzg/ip/cidrv6";
 * import { parseIpv6, stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("2001:db8:ffff:ffff:ffff:ffff::/120");
 * let currentIp = cidr6FirstAddress(cidr) + 1n;
 *
 * while (cidr6Contains(cidr, currentIp)) {
 *   const assigned = stringifyIpv6(currentIp);
 *   currentIp = currentIp + 1n;
 *   if (currentIp > cidr6LastAddress(cidr)) break;
 * }
 *
 * assert(cidr6Contains(cidr, parseIpv6("2001:db8:ffff:ffff:ffff:ffff::1")));
 * assertEquals(cidr6Contains(cidr, parseIpv6("2001:db9::1")), false);
 * ```
 *
 * @module
 */

import { parseIpv6, stringifyIpv6 } from "./ipv6.ts";

/**
 * Represents an IPv6 CIDR block.
 *
 * Contains only the parsed values from the CIDR notation.
 */
export type Cidr6 = {
  /** The IPv6 address from the CIDR notation */
  readonly address: bigint;
  /** The prefix length (0-128) */
  readonly prefixLength: number;
};

/**
 * Creates a network mask from an IPv6 prefix length.
 *
 * The prefix length must be between 0 and 128 (inclusive).
 *
 * @param prefixLength The CIDR prefix length (0-128)
 * @returns The network mask as a bigint
 * @throws {RangeError} If the prefix length is out of range
 *
 * @example Creating masks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mask6FromPrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(mask6FromPrefixLength(128), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn);
 * assertEquals(mask6FromPrefixLength(64), 0xFFFFFFFFFFFFFFFF0000000000000000n);
 * assertEquals(mask6FromPrefixLength(48), 0xFFFFFFFFFFFF00000000000000000000n);
 * assertEquals(mask6FromPrefixLength(32), 0xFFFFFFFF000000000000000000000000n);
 * assertEquals(mask6FromPrefixLength(0), 0n);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { mask6FromPrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => mask6FromPrefixLength(-1), RangeError);
 * assertThrows(() => mask6FromPrefixLength(129), RangeError);
 * ```
 */
export function mask6FromPrefixLength(prefixLength: number): bigint {
  if (prefixLength < 0 || prefixLength > 128 || !Number.isInteger(prefixLength)) {
    throw new RangeError(
      `CIDR prefix length must be 0-128, got ${prefixLength}`,
    );
  }

  if (prefixLength === 0) {
    return 0n;
  }

  return (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn << BigInt(128 - prefixLength)) &
    0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
}

/**
 * Parses an IPv6 CIDR notation string to a Cidr6 object.
 *
 * Returns only the parsed values (address and prefix length).
 *
 * @param cidr The CIDR notation string (e.g., "2001:db8::/32")
 * @returns A Cidr6 object containing the parsed address and prefix length
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If the prefix length is out of range (not 0-128)
 * @throws Propagates errors from parseIpv6 if the address part is invalid
 *
 * @example Basic CIDR parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidr6("2001:db8::/32");
 * assertEquals(cidr.address, 42540766411282592856903984951653826560n);
 * assertEquals(cidr.prefixLength, 32);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidr6 } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => parseCidr6("2001:db8::"), TypeError);
 * assertThrows(() => parseCidr6("2001:db8::/"), TypeError);
 * assertThrows(() => parseCidr6("2001:db8::/129"), RangeError);
 * ```
 */
export function parseCidr6(cidr: string): Cidr6 {
  const slashIndex = cidr.lastIndexOf("/");

  if (slashIndex === -1) {
    throw new TypeError(
      `CIDR notation must be in format '<address>/<prefix>'`,
    );
  }

  const addressPart = cidr.slice(0, slashIndex);
  const prefixPart = cidr.slice(slashIndex + 1);

  if (prefixPart === "") {
    throw new TypeError("CIDR prefix length must be specified");
  }

  const address = parseIpv6(addressPart);
  const prefixLength = parseInt(prefixPart, 10);

  if (Number.isNaN(prefixLength)) {
    throw new TypeError("CIDR prefix length must be a number");
  }

  // Validate prefix length
  mask6FromPrefixLength(prefixLength);

  return {
    address,
    prefixLength,
  };
}

/**
 * Stringifies a Cidr6 object to CIDR notation.
 *
 * @param cidr The Cidr6 object to stringify
 * @returns The CIDR notation string (e.g., "2001:db8::/32")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr6, stringifyCidr6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidr6("2001:db8::/32");
 * assertEquals(stringifyCidr6(cidr), "2001:db8::/32");
 * ```
 */
export function stringifyCidr6(cidr: Cidr6): string {
  return `${stringifyIpv6(cidr.address)}/${cidr.prefixLength}`;
}

/**
 * Checks if an IPv6 address (as bigint) is contained within a CIDR block.
 *
 * @param cidr The CIDR block to check against
 * @param ip The IPv6 address to check
 * @returns true if the IP is within the CIDR range, false otherwise
 *
 * @example Basic contains check
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidr6Contains, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("2001:db8::/32");
 *
 * assert(cidr6Contains(cidr, parseIpv6("2001:db8::")));
 * assert(cidr6Contains(cidr, parseIpv6("2001:db8::1")));
 * assert(cidr6Contains(cidr, parseIpv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(cidr6Contains(cidr, parseIpv6("2001:db9::1")), false);
 * assertEquals(cidr6Contains(cidr, parseIpv6("2001:db7:ffff:ffff:ffff:ffff:ffff:ffff")), false);
 * ```
 *
 * @example IP assignment workflow
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidr6Contains,
 *   cidr6FirstAddress,
 *   cidr6LastAddress,
 *   parseCidr6,
 * } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidr6("fd00::/120"); // 256 IPs
 * let currentIp = cidr6FirstAddress(cidr) + 1n;
 *
 * const assigned: bigint[] = [];
 * while (currentIp < cidr6LastAddress(cidr)) {
 *   assert(cidr6Contains(cidr, currentIp));
 *   assigned.push(currentIp);
 *   currentIp = currentIp + 1n;
 * }
 * ```
 */
export function cidr6Contains(cidr: Cidr6, ip: bigint): boolean {
  const mask = mask6FromPrefixLength(cidr.prefixLength);
  const network = cidr.address & mask;
  return (ip & mask) === network;
}

/**
 * Returns the first address of a CIDR block.
 *
 * @param cidr The CIDR block
 * @returns The first address as a bigint
 *
 * @example Getting first address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6FirstAddress, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("2001:db8::/32");
 * assertEquals(cidr6FirstAddress(cidr), parseIpv6("2001:db8::"));
 * ```
 */
export function cidr6FirstAddress(cidr: Cidr6): bigint {
  const mask = mask6FromPrefixLength(cidr.prefixLength);
  return cidr.address & mask;
}

/**
 * Returns the last address of a CIDR block.
 *
 * @param cidr The CIDR block
 * @returns The last address as a bigint
 *
 * @example Getting last address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6LastAddress, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("2001:db8::/120");
 * assertEquals(cidr6LastAddress(cidr), parseIpv6("2001:db8::ff"));
 * ```
 */
export function cidr6LastAddress(cidr: Cidr6): bigint {
  const mask = mask6FromPrefixLength(cidr.prefixLength);
  const network = cidr.address & mask;
  return network | (~mask & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn);
}

/**
 * Returns the total number of IP addresses in a CIDR block or for a given prefix length.
 *
 * For a /120 network, this returns 256n. For a /128, this returns 1n.
 *
 * **Warning**: IPv6 subnets can be enormous. A /64 has 2^64 addresses.
 * The result is a bigint to handle these large values.
 *
 * @param cidr The CIDR block
 * @returns The total number of addresses in the CIDR range as a bigint
 *
 * @example Getting CIDR size from Cidr6 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Size, parseCidr6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidr6Size(parseCidr6("fd00::/120")), 256n);
 * assertEquals(cidr6Size(parseCidr6("2001:db8::/32")), 79228162514264337593543950336n);
 * assertEquals(cidr6Size(parseCidr6("::1/128")), 1n);
 * assertEquals(cidr6Size(parseCidr6("::/64")), 18446744073709551616n);
 * ```
 *
 * @example Getting CIDR size from prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Size } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidr6Size(120), 256n);
 * assertEquals(cidr6Size(128), 1n);
 * assertEquals(cidr6Size(64), 18446744073709551616n);
 * ```
 *
 * @example Error handling for invalid prefix length
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidr6Size } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidr6Size(-1), RangeError);
 * assertThrows(() => cidr6Size(129), RangeError);
 * ```
 */
export function cidr6Size(cidr: Cidr6): bigint;
export function cidr6Size(prefixLength: number): bigint;
export function cidr6Size(cidrOrPrefixLength: Cidr6 | number): bigint {
  const prefixLength = typeof cidrOrPrefixLength === "number"
    ? cidrOrPrefixLength
    : cidrOrPrefixLength.prefixLength;

  if (prefixLength < 0 || prefixLength > 128 || !Number.isInteger(prefixLength)) {
    throw new RangeError(
      `CIDR prefix length must be 0-128, got ${prefixLength}`,
    );
  }

  return 2n ** BigInt(128 - prefixLength);
}

/**
 * Generates a range of IP addresses from a CIDR block.
 *
 * Yields IP addresses starting at the specified offset from the
 * network address. The offset is relative to the network address (offset 0 = network address).
 * The step parameter controls the increment (positive or negative) between consecutive addresses.
 * Only addresses within the CIDR range are yielded.
 *
 * By default (when count is not specified), iterates through all addresses in the CIDR range
 * from the offset to the boundary (last address for positive step, network for negative step).
 *
 * **Warning**: IPv6 subnets can be enormous. A /64 has 2^64 addresses. Use count or
 * iterate lazily to avoid memory issues.
 *
 * @param cidr The CIDR block to generate addresses from
 * @param options Optional configuration for address generation
 * @param options.offset The offset from the network address (0-based, defaults to 0 for network address)
 * @param options.count The maximum number of addresses to generate (defaults to undefined = iterate until CIDR boundary)
 * @param options.step The increment between addresses (positive or negative, defaults to 1)
 * @returns A generator yielding IP addresses as bigints (may yield less than count if CIDR boundary is reached)
 *
 * @example Default behavior - iterate from offset 0
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Addresses, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("fd00::/120"); // 256 IPs: ::0 to ::ff
 *
 * // Get first 5 IPs (offset=0 by default, starts at network address)
 * const first5 = Array.from(cidr6Addresses(cidr, { count: 5 }));
 * assertEquals(first5.map(stringifyIpv6), [
 *   "fd00::", "fd00::1", "fd00::2", "fd00::3", "fd00::4",
 * ]);
 * ```
 *
 * @example Limiting with count parameter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Addresses, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("fd00::/120");
 *
 * // Get first 3 IPs starting at network address
 * const first3 = Array.from(cidr6Addresses(cidr, { offset: 0, count: 3 }));
 * assertEquals(first3, [
 *   parseIpv6("fd00::0"),
 *   parseIpv6("fd00::1"),
 *   parseIpv6("fd00::2"),
 * ]);
 * ```
 *
 * @example Custom step for even IPs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Addresses, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("fd00::/120");
 *
 * // Get every other IP (even addresses)
 * const evenIps = Array.from(cidr6Addresses(cidr, { offset: 0, count: 5, step: 2 }));
 * assertEquals(evenIps, [
 *   parseIpv6("fd00::0"),
 *   parseIpv6("fd00::2"),
 *   parseIpv6("fd00::4"),
 *   parseIpv6("fd00::6"),
 *   parseIpv6("fd00::8"),
 * ]);
 * ```
 *
 * @example Negative step for reverse iteration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Addresses, parseCidr6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidr6("fd00::/120");
 *
 * // Get 5 IPs counting backwards from offset 10
 * const backwards = Array.from(cidr6Addresses(cidr, { offset: 10, count: 5, step: -1 }));
 * assertEquals(backwards, [
 *   parseIpv6("fd00::a"),
 *   parseIpv6("fd00::9"),
 *   parseIpv6("fd00::8"),
 *   parseIpv6("fd00::7"),
 *   parseIpv6("fd00::6"),
 * ]);
 * ```
 *
 * @example CIDR boundary handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Addresses, parseCidr6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidr6("fd00::/125"); // Only 8 IPs: ::0 to ::7
 *
 * // Requesting more IPs than available stops at CIDR boundary
 * const ips = Array.from(cidr6Addresses(cidr, { offset: 5, count: 10, step: 1 }));
 * assertEquals(ips.length, 3); // Only ::5, ::6, ::7 are in range
 *
 * // Negative step stops at CIDR start
 * const reverseIps = Array.from(cidr6Addresses(cidr, { offset: 3, count: 10, step: -1 }));
 * assertEquals(reverseIps.length, 4); // ::3, ::2, ::1, ::0
 * ```
 */
export function* cidr6Addresses(
  cidr: Cidr6,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<bigint> {
  const network = cidr6FirstAddress(cidr);
  const offset = options?.offset ?? 0;
  const count = options?.count;
  const step = options?.step ?? 1;

  let currentIp = network + BigInt(offset);
  const stepSize = BigInt(step);
  const maxCount = count !== undefined ? Number(count) : Infinity;

  let i = 0;
  while (i < maxCount && cidr6Contains(cidr, currentIp)) {
    yield currentIp;
    currentIp += stepSize;
    i++;
  }
}
