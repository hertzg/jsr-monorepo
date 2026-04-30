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
 *   cidrv6Contains,
 *   cidrv6FirstAddress,
 *   cidrv6LastAddress,
 *   parseCidrv6,
 * } from "@hertzg/ip/cidrv6";
 * import { parseIpv6, stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("2001:db8:ffff:ffff:ffff:ffff::/120");
 * let currentIp = cidrv6FirstAddress(cidr) + 1n;
 *
 * while (cidrv6Contains(cidr, currentIp)) {
 *   const assigned = stringifyIpv6(currentIp);
 *   currentIp = currentIp + 1n;
 *   if (currentIp > cidrv6LastAddress(cidr)) break;
 * }
 *
 * assert(cidrv6Contains(cidr, parseIpv6("2001:db8:ffff:ffff:ffff:ffff::1")));
 * assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db9::1")), false);
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
export type Cidrv6 = {
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
 * import { cidrv6Mask } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Mask(128), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn);
 * assertEquals(cidrv6Mask(64), 0xFFFFFFFFFFFFFFFF0000000000000000n);
 * assertEquals(cidrv6Mask(48), 0xFFFFFFFFFFFF00000000000000000000n);
 * assertEquals(cidrv6Mask(32), 0xFFFFFFFF000000000000000000000000n);
 * assertEquals(cidrv6Mask(0), 0n);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6Mask } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidrv6Mask(-1), RangeError);
 * assertThrows(() => cidrv6Mask(129), RangeError);
 * ```
 */
export function cidrv6Mask(prefixLength: number): bigint {
  if (
    prefixLength < 0 || prefixLength > 128 || !Number.isInteger(prefixLength)
  ) {
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
 * Parses an IPv6 CIDR notation string to a Cidrv6 object.
 *
 * Returns only the parsed values (address and prefix length).
 *
 * @param cidr The CIDR notation string (e.g., "2001:db8::/32")
 * @returns A Cidrv6 object containing the parsed address and prefix length
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If the prefix length is out of range (not 0-128)
 * @throws Propagates errors from parseIpv6 if the address part is invalid
 *
 * @example Basic CIDR parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(cidr.address, 42540766411282592856903984951653826560n);
 * assertEquals(cidr.prefixLength, 32);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => parseCidrv6("2001:db8::"), TypeError);
 * assertThrows(() => parseCidrv6("2001:db8::/"), TypeError);
 * assertThrows(() => parseCidrv6("2001:db8::/129"), RangeError);
 * ```
 */
export function parseCidrv6(cidr: string): Cidrv6 {
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
  cidrv6Mask(prefixLength);

  return {
    address,
    prefixLength,
  };
}

/**
 * Stringifies a Cidrv6 object to CIDR notation.
 *
 * @param cidr The Cidrv6 object to stringify
 * @returns The CIDR notation string (e.g., "2001:db8::/32")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(stringifyCidrv6(cidr), "2001:db8::/32");
 * ```
 */
export function stringifyCidrv6(cidr: Cidrv6): string {
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
 * import { cidrv6Contains, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 *
 * assert(cidrv6Contains(cidr, parseIpv6("2001:db8::")));
 * assert(cidrv6Contains(cidr, parseIpv6("2001:db8::1")));
 * assert(cidrv6Contains(cidr, parseIpv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db9::1")), false);
 * assertEquals(cidrv6Contains(cidr, parseIpv6("2001:db7:ffff:ffff:ffff:ffff:ffff:ffff")), false);
 * ```
 *
 * @example IP assignment workflow
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidrv6Contains,
 *   cidrv6FirstAddress,
 *   cidrv6LastAddress,
 *   parseCidrv6,
 * } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("fd00::/120"); // 256 IPs
 * let currentIp = cidrv6FirstAddress(cidr) + 1n;
 *
 * const assigned: bigint[] = [];
 * while (currentIp < cidrv6LastAddress(cidr)) {
 *   assert(cidrv6Contains(cidr, currentIp));
 *   assigned.push(currentIp);
 *   currentIp = currentIp + 1n;
 * }
 * ```
 */
export function cidrv6Contains(cidr: Cidrv6, ip: bigint): boolean {
  const mask = cidrv6Mask(cidr.prefixLength);
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
 * import { cidrv6FirstAddress, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(cidrv6FirstAddress(cidr), parseIpv6("2001:db8::"));
 * ```
 */
export function cidrv6FirstAddress(cidr: Cidrv6): bigint {
  const mask = cidrv6Mask(cidr.prefixLength);
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
 * import { cidrv6LastAddress, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("2001:db8::/120");
 * assertEquals(cidrv6LastAddress(cidr), parseIpv6("2001:db8::ff"));
 * ```
 */
export function cidrv6LastAddress(cidr: Cidrv6): bigint {
  const mask = cidrv6Mask(cidr.prefixLength);
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
 * @example Getting CIDR size from Cidrv6 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Size, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Size(parseCidrv6("fd00::/120")), 256n);
 * assertEquals(cidrv6Size(parseCidrv6("2001:db8::/32")), 79228162514264337593543950336n);
 * assertEquals(cidrv6Size(parseCidrv6("::1/128")), 1n);
 * assertEquals(cidrv6Size(parseCidrv6("::/64")), 18446744073709551616n);
 * ```
 *
 * @example Getting CIDR size from prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Size } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Size(120), 256n);
 * assertEquals(cidrv6Size(128), 1n);
 * assertEquals(cidrv6Size(64), 18446744073709551616n);
 * ```
 *
 * @example Error handling for invalid prefix length
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6Size } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidrv6Size(-1), RangeError);
 * assertThrows(() => cidrv6Size(129), RangeError);
 * ```
 */
export function cidrv6Size(cidr: Cidrv6): bigint;
export function cidrv6Size(prefixLength: number): bigint;
export function cidrv6Size(cidrOrPrefixLength: Cidrv6 | number): bigint;
export function cidrv6Size(cidrOrPrefixLength: Cidrv6 | number): bigint {
  const prefixLength = typeof cidrOrPrefixLength === "number"
    ? cidrOrPrefixLength
    : cidrOrPrefixLength.prefixLength;

  if (
    prefixLength < 0 || prefixLength > 128 || !Number.isInteger(prefixLength)
  ) {
    throw new RangeError(
      `CIDR prefix length must be 0-128, got ${prefixLength}`,
    );
  }

  return 2n ** BigInt(128 - prefixLength);
}

/**
 * Checks if one IPv6 CIDR block fully contains another.
 *
 * Returns true when every address in `inner` is also in `outer`.
 * This is the case when `outer` has a shorter-or-equal prefix and
 * both network addresses agree under the outer mask.
 *
 * @param outer The CIDR block that may contain the other
 * @param inner The CIDR block that may be contained
 * @returns true if every address in `inner` is within `outer`
 *
 * @example Supernet contains subnet
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv6ContainsCidr, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assert(cidrv6ContainsCidr(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8:1::/48")));
 * assert(cidrv6ContainsCidr(parseCidrv6("fd00::/8"), parseCidrv6("fd00::/120")));
 * assertEquals(cidrv6ContainsCidr(parseCidrv6("2001:db8:1::/48"), parseCidrv6("2001:db8::/32")), false);
 * ```
 *
 * @example Equal CIDRs contain each other
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv6ContainsCidr, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/64");
 * assert(cidrv6ContainsCidr(cidr, cidr));
 * ```
 *
 * @example /0 contains everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv6ContainsCidr, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const all = parseCidrv6("::/0");
 * assert(cidrv6ContainsCidr(all, parseCidrv6("2001:db8::/32")));
 * assert(cidrv6ContainsCidr(all, parseCidrv6("::1/128")));
 * ```
 */
export function cidrv6ContainsCidr(outer: Cidrv6, inner: Cidrv6): boolean {
  if (outer.prefixLength > inner.prefixLength) return false;
  const outerMask = cidrv6Mask(outer.prefixLength);
  return (outer.address & outerMask) === (inner.address & outerMask);
}

/**
 * Checks if two IPv6 CIDR blocks overlap (share at least one address).
 *
 * Two CIDRs overlap when one contains at least one address of the other.
 * This is equivalent to checking containment using the shorter prefix.
 * The check is symmetric: `cidrv6Overlaps(a, b) === cidrv6Overlaps(b, a)`.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if the two CIDR ranges share at least one address
 *
 * @example Overlapping CIDRs
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv6Overlaps, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assert(cidrv6Overlaps(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8:1::/48")));
 * assert(cidrv6Overlaps(parseCidrv6("2001:db8:1::/48"), parseCidrv6("2001:db8::/32")));
 * assert(cidrv6Overlaps(parseCidrv6("fd00::/120"), parseCidrv6("fd00::/120")));
 * assertEquals(cidrv6Overlaps(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db9::/32")), false);
 * ```
 *
 * @example /0 overlaps everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv6Overlaps, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const all = parseCidrv6("::/0");
 * assert(cidrv6Overlaps(all, parseCidrv6("2001:db8::/32")));
 * assert(cidrv6Overlaps(all, parseCidrv6("::1/128")));
 * ```
 *
 * @example Adjacent but non-overlapping
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Overlaps, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Overlaps(parseCidrv6("2001:db8::/33"), parseCidrv6("2001:db8:8000::/33")), false);
 * ```
 */
export function cidrv6Overlaps(a: Cidrv6, b: Cidrv6): boolean {
  const minPrefix = Math.min(a.prefixLength, b.prefixLength);
  const mask = cidrv6Mask(minPrefix);
  return (a.address & mask) === (b.address & mask);
}

/**
 * Splits an IPv6 CIDR block into its two half-sized children at prefix+1.
 *
 * @param cidr The CIDR block to split
 * @returns A tuple of the lower and upper halves
 */
function cidrv6SplitHalves(cidr: Cidrv6): [Cidrv6, Cidrv6] {
  const newPrefix = cidr.prefixLength + 1;
  const network = cidrv6FirstAddress(cidr);
  const lower: Cidrv6 = { address: network, prefixLength: newPrefix };
  const upper: Cidrv6 = {
    address: network | (1n << BigInt(127 - cidr.prefixLength)),
    prefixLength: newPrefix,
  };
  return [lower, upper];
}

/**
 * Returns the intersection of two IPv6 CIDR blocks.
 *
 * Since CIDR blocks are power-of-2-aligned, two overlapping blocks always
 * have a containment relationship -- the intersection is the more specific
 * (longer prefix) block with its canonical network address.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns The overlapping CIDR with canonical network address, or null if disjoint
 *
 * @example Find overlap between allocations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Intersect, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Intersect(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db8::/48"),
 * );
 * assertEquals(result && stringifyCidrv6(result), "2001:db8::/48");
 * ```
 *
 * @example No overlap returns null
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Intersect, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Intersect(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db9::/32"),
 * ), null);
 * ```
 */
export function cidrv6Intersect(a: Cidrv6, b: Cidrv6): Cidrv6 | null {
  if (!cidrv6Overlaps(a, b)) return null;
  if (a.prefixLength >= b.prefixLength) {
    return { address: cidrv6FirstAddress(a), prefixLength: a.prefixLength };
  }
  return { address: cidrv6FirstAddress(b), prefixLength: b.prefixLength };
}

/**
 * Subtracts one IPv6 CIDR block from another.
 *
 * Returns the minimal set of CIDR blocks representing all IP addresses
 * in `a` but not in `b`. The algorithm recursively splits `a` into two
 * halves at prefix+1, keeping the non-overlapping half and recursing
 * into the overlapping half.
 *
 * @param a The CIDR block to subtract from
 * @param b The CIDR block to subtract
 * @returns Array of CIDR blocks covering a minus b
 *
 * @example Carve a /48 from a /32
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db8::/48"),
 * );
 * assertEquals(result.length, 16);
 * assertEquals(stringifyCidrv6(result[0]), "2001:db8:8000::/33");
 * ```
 *
 * @example No overlap -- original returned unchanged
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db9::/32"),
 * );
 * assertEquals(result.map(stringifyCidrv6), ["2001:db8::/32"]);
 * ```
 *
 * @example Full containment -- empty result
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/48"),
 *   parseCidrv6("2001:db8::/32"),
 * );
 * assertEquals(result, []);
 * ```
 */
export function cidrv6Subtract(a: Cidrv6, b: Cidrv6): Cidrv6[] {
  if (!cidrv6Overlaps(a, b)) return [a];
  if (cidrv6ContainsCidr(b, a)) return [];
  const [lower, upper] = cidrv6SplitHalves(a);
  return [...cidrv6Subtract(upper, b), ...cidrv6Subtract(lower, b)];
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
 * IPv6 subnets can be enormous. A /64 has 2^64 addresses. Use `count` or iterate lazily
 * to avoid memory issues.
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
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("fd00::/120"); // 256 IPs: ::0 to ::ff
 *
 * // Get first 5 IPs (offset=0 by default, starts at network address)
 * const first5 = Array.from(cidrv6Addresses(cidr, { count: 5 }));
 * assertEquals(first5.map(stringifyIpv6), [
 *   "fd00::", "fd00::1", "fd00::2", "fd00::3", "fd00::4",
 * ]);
 * ```
 *
 * @example Limiting with count parameter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("fd00::/120");
 *
 * // Get first 3 IPs starting at network address
 * const first3 = Array.from(cidrv6Addresses(cidr, { offset: 0, count: 3 }));
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
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("fd00::/120");
 *
 * // Get every other IP (even addresses)
 * const evenIps = Array.from(cidrv6Addresses(cidr, { offset: 0, count: 5, step: 2 }));
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
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const cidr = parseCidrv6("fd00::/120");
 *
 * // Get 5 IPs counting backwards from offset 10
 * const backwards = Array.from(cidrv6Addresses(cidr, { offset: 10, count: 5, step: -1 }));
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
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("fd00::/125"); // Only 8 IPs: ::0 to ::7
 *
 * // Requesting more IPs than available stops at CIDR boundary
 * const ips = Array.from(cidrv6Addresses(cidr, { offset: 5, count: 10, step: 1 }));
 * assertEquals(ips.length, 3); // Only ::5, ::6, ::7 are in range
 *
 * // Negative step stops at CIDR start
 * const reverseIps = Array.from(cidrv6Addresses(cidr, { offset: 3, count: 10, step: -1 }));
 * assertEquals(reverseIps.length, 4); // ::3, ::2, ::1, ::0
 * ```
 */
export function* cidrv6Addresses(
  cidr: Cidrv6,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<bigint> {
  const network = cidrv6FirstAddress(cidr);
  const offset = options?.offset ?? 0;
  const count = options?.count;
  const step = options?.step ?? 1;

  let currentIp = network + BigInt(offset);
  const stepSize = BigInt(step);
  const maxCount = count !== undefined ? Number(count) : Infinity;

  let i = 0;
  while (i < maxCount && cidrv6Contains(cidr, currentIp)) {
    yield currentIp;
    currentIp += stepSize;
    i++;
  }
}

/**
 * Checks if two IPv6 CIDR blocks are sibling halves of the same parent block.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if a and b are siblings
 */
function cidrv6AreSiblings(a: Cidrv6, b: Cidrv6): boolean {
  if (a.prefixLength !== b.prefixLength || a.prefixLength === 0) return false;
  const parentMask = cidrv6Mask(a.prefixLength - 1);
  return (a.address & parentMask) === (b.address & parentMask);
}

/**
 * Merges IPv6 CIDR blocks into the minimal covering set.
 *
 * Takes an array of possibly overlapping, adjacent, or redundant CIDR
 * blocks and returns the minimal set of non-overlapping CIDR prefix
 * blocks covering the exact same address space.
 *
 * @param cidrs The CIDR blocks to merge
 * @returns Minimal set of non-overlapping CIDR blocks, sorted by address
 *
 * @example Compact adjacent allocations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Merge, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const blocks = [
 *   parseCidrv6("2001:db8::/33"),
 *   parseCidrv6("2001:db8:8000::/33"),
 * ];
 * assertEquals(cidrv6Merge(blocks).map(stringifyCidrv6), ["2001:db8::/32"]);
 * ```
 *
 * @example Remove contained and merge siblings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Merge, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const blocks = [
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db8:1::/48"),
 * ];
 * assertEquals(cidrv6Merge(blocks).map(stringifyCidrv6), ["2001:db8::/32"]);
 * ```
 */
export function cidrv6Merge(cidrs: readonly Cidrv6[]): Cidrv6[] {
  if (cidrs.length === 0) return [];

  // Step 1: Normalize - apply mask to get canonical network addresses
  let list: Cidrv6[] = cidrs.map((cidr) => ({
    address: cidrv6FirstAddress(cidr),
    prefixLength: cidr.prefixLength,
  }));

  // Step 2: Sort by (address ascending, prefixLength ascending)
  list.sort((a, b) =>
    Number(a.address < b.address ? -1n : a.address > b.address ? 1n : 0n) ||
    a.prefixLength - b.prefixLength
  );

  // Step 3: Remove contained blocks
  const deduped: Cidrv6[] = [];
  let currentLast = -1n;
  for (const cidr of list) {
    const last = cidrv6LastAddress(cidr);
    if (last <= currentLast) continue;
    deduped.push(cidr);
    currentLast = last;
  }
  list = deduped;

  // Step 4: Merge adjacent siblings iteratively until stable
  let changed = true;
  while (changed) {
    changed = false;
    const merged: Cidrv6[] = [];
    let i = 0;
    while (i < list.length) {
      if (
        i + 1 < list.length && cidrv6AreSiblings(list[i], list[i + 1])
      ) {
        merged.push({
          address: list[i].address,
          prefixLength: list[i].prefixLength - 1,
        });
        i += 2;
        changed = true;
      } else {
        merged.push(list[i]);
        i += 1;
      }
    }
    list = merged;
  }

  return list;
}
