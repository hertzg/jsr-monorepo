/**
 * IPv4 CIDR notation parsing and utilities.
 *
 * This module provides CIDR parsing, network calculations, and IP range
 * checking for IPv4 networks. Works with number representations to enable
 * efficient IP assignment workflows.
 *
 * @example CIDR operations
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import {
 *   cidrv4BroadcastAddress,
 *   cidrv4Contains,
 *   cidrv4NetworkAddress,
 *   parseCidrv4,
 * } from "@hertzg/ip/cidrv4";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * let currentIp = cidrv4NetworkAddress(cidr) + 1;
 *
 * while (cidrv4Contains(cidr, currentIp)) {
 *   const assigned = stringifyIpv4(currentIp);
 *   currentIp = currentIp + 1;
 *   if (currentIp > cidrv4BroadcastAddress(cidr)) break;
 * }
 *
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.1")));
 * assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.2.1")), false);
 * ```
 *
 * @module
 */

import { parseIpv4, stringifyIpv4 } from "./ipv4.ts";

/**
 * Represents an IPv4 CIDR block.
 *
 * Contains only the parsed values from the CIDR notation.
 */
export type Cidrv4 = {
  /** The IPv4 address from the CIDR notation */
  readonly address: number;
  /** The prefix length (0-32) */
  readonly prefixLength: number;
};

/**
 * Creates a network mask from an IPv4 prefix length.
 *
 * The prefix length must be between 0 and 32 (inclusive).
 *
 * @param prefixLength The CIDR prefix length (0-32)
 * @returns The network mask as a 32-bit unsigned integer
 * @throws {RangeError} If the prefix length is out of range
 *
 * @example Creating masks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Mask(24), 0xFFFFFF00);
 * assertEquals(cidrv4Mask(16), 0xFFFF0000);
 * assertEquals(cidrv4Mask(8), 0xFF000000);
 * assertEquals(cidrv4Mask(32), 0xFFFFFFFF);
 * assertEquals(cidrv4Mask(0), 0);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4Mask(-1), RangeError);
 * assertThrows(() => cidrv4Mask(33), RangeError);
 * ```
 */
export function cidrv4Mask(prefixLength: number): number {
  if (
    prefixLength < 0 || prefixLength > 32 || !Number.isInteger(prefixLength)
  ) {
    throw new RangeError(
      `CIDR prefix length must be 0-32, got ${prefixLength}`,
    );
  }

  if (prefixLength === 0) {
    return 0;
  }

  return ((0xFFFFFFFF << (32 - prefixLength)) >>> 0);
}

/**
 * Parses an IPv4 CIDR notation string to a Cidrv4 object.
 *
 * Returns only the parsed values (address and prefix length).
 *
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns A Cidrv4 object containing the parsed address and prefix length
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If the prefix length is out of range (not 0-32)
 * @throws Propagates errors from parseIpv4 if the address part is invalid
 *
 * @example Basic CIDR parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidr.address, 3232235776);
 * assertEquals(cidr.prefixLength, 24);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => parseCidrv4("192.168.1.0"), TypeError);
 * assertThrows(() => parseCidrv4("192.168.1.0/"), TypeError);
 * assertThrows(() => parseCidrv4("192.168.1.0/33"), RangeError);
 * assertThrows(() => parseCidrv4("256.0.0.0/24"), RangeError);
 * ```
 */
export function parseCidrv4(cidr: string): Cidrv4 {
  const parts = cidr.split("/");

  if (parts.length !== 2) {
    throw new TypeError(
      `CIDR notation must be in format '<address>/<prefix>', got ${parts.length} parts`,
    );
  }

  const address = parseIpv4(parts[0]);
  const prefixLength = parseInt(parts[1], 10);

  if (Number.isNaN(prefixLength)) {
    throw new TypeError("CIDR prefix length must be a number");
  }

  // Validate prefix length
  cidrv4Mask(prefixLength);

  return {
    address,
    prefixLength,
  };
}

/**
 * Stringifies a Cidrv4 object to CIDR notation.
 *
 * @param cidr The Cidrv4 object to stringify
 * @returns The CIDR notation string (e.g., "192.168.1.0/24")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(stringifyCidrv4(cidr), "192.168.1.0/24");
 * ```
 */
export function stringifyCidrv4(cidr: Cidrv4): string {
  return `${stringifyIpv4(cidr.address)}/${cidr.prefixLength}`;
}

/**
 * Checks if an IPv4 address is contained within a CIDR block.
 *
 * @param cidr The CIDR block to check against
 * @param ip The IPv4 address to check
 * @returns true if the IP is within the CIDR range, false otherwise
 *
 * @example Basic contains check
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.0")));
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.100")));
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.255")));
 * assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.2.1")), false);
 * assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.0.255")), false);
 * ```
 *
 * @example IP assignment workflow
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidrv4BroadcastAddress,
 *   cidrv4Contains,
 *   cidrv4NetworkAddress,
 *   parseCidrv4,
 * } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/29");
 * let currentIp = cidrv4NetworkAddress(cidr) + 1;
 *
 * const assigned: number[] = [];
 * while (currentIp < cidrv4BroadcastAddress(cidr)) {
 *   assert(cidrv4Contains(cidr, currentIp));
 *   assigned.push(currentIp);
 *   currentIp = currentIp + 1;
 * }
 * ```
 */
export function cidrv4Contains(cidr: Cidrv4, ip: number): boolean {
  const mask = cidrv4Mask(cidr.prefixLength);
  const network = (cidr.address & mask) >>> 0;
  return ((ip & mask) >>> 0) === network;
}

/**
 * Returns the first address of a CIDR block (network address).
 *
 * @param cidr The CIDR block
 * @returns The first address as a 32-bit unsigned integer
 *
 * @example Getting first address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4FirstAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4FirstAddress(cidr), parseIpv4("192.168.1.0"));
 * ```
 */
export function cidrv4FirstAddress(cidr: Cidrv4): number {
  const mask = cidrv4Mask(cidr.prefixLength);
  return (cidr.address & mask) >>> 0;
}

/**
 * Returns the network address (first IP) of a CIDR block.
 *
 * Alias for {@link cidrv4FirstAddress}.
 *
 * @param cidr The CIDR block
 * @returns The network address as a 32-bit unsigned integer
 *
 * @example Getting network address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4NetworkAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4NetworkAddress(cidr), parseIpv4("192.168.1.0"));
 * ```
 */
export const cidrv4NetworkAddress: typeof cidrv4FirstAddress =
  cidrv4FirstAddress;

/**
 * Returns the last address of a CIDR block (broadcast address for IPv4).
 *
 * @param cidr The CIDR block
 * @returns The last address as a 32-bit unsigned integer
 *
 * @example Getting last address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4LastAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4LastAddress(cidr), parseIpv4("192.168.1.255"));
 * ```
 */
export function cidrv4LastAddress(cidr: Cidrv4): number {
  const mask = cidrv4Mask(cidr.prefixLength);
  const network = (cidr.address & mask) >>> 0;
  return (network | (~mask >>> 0)) >>> 0;
}

/**
 * Returns the broadcast address (last IP) of a CIDR block.
 *
 * Alias for {@link cidrv4LastAddress}.
 *
 * @param cidr The CIDR block
 * @returns The broadcast address as a 32-bit unsigned integer
 *
 * @example Getting broadcast address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4BroadcastAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4BroadcastAddress(cidr), parseIpv4("192.168.1.255"));
 * ```
 */
export const cidrv4BroadcastAddress: typeof cidrv4LastAddress =
  cidrv4LastAddress;

/**
 * Returns the total number of IP addresses in a CIDR block or for a given prefix length.
 *
 * For a /24 network, this returns 256. For a /32, this returns 1.
 *
 * @param cidr The CIDR block
 * @returns The total number of addresses in the CIDR range
 *
 * @example Getting CIDR size from Cidrv4 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Size, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Size(parseCidrv4("192.168.1.0/24")), 256);
 * assertEquals(cidrv4Size(parseCidrv4("10.0.0.0/8")), 16777216);
 * assertEquals(cidrv4Size(parseCidrv4("192.168.1.1/32")), 1);
 * assertEquals(cidrv4Size(parseCidrv4("0.0.0.0/0")), 4294967296);
 * ```
 *
 * @example Getting CIDR size from prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Size } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Size(24), 256);
 * assertEquals(cidrv4Size(8), 16777216);
 * assertEquals(cidrv4Size(32), 1);
 * assertEquals(cidrv4Size(0), 4294967296);
 * ```
 *
 * @example Error handling for invalid prefix length
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4Size } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4Size(-1), RangeError);
 * assertThrows(() => cidrv4Size(33), RangeError);
 * ```
 */
export function cidrv4Size(cidr: Cidrv4): number;
export function cidrv4Size(prefixLength: number): number;
export function cidrv4Size(cidrOrPrefixLength: Cidrv4 | number): number;
export function cidrv4Size(cidrOrPrefixLength: Cidrv4 | number): number {
  const prefixLength = typeof cidrOrPrefixLength === "number"
    ? cidrOrPrefixLength
    : cidrOrPrefixLength.prefixLength;

  if (
    prefixLength < 0 || prefixLength > 32 || !Number.isInteger(prefixLength)
  ) {
    throw new RangeError(
      `CIDR prefix length must be 0-32, got ${prefixLength}`,
    );
  }

  return 2 ** (32 - prefixLength);
}

/**
 * Checks if one IPv4 CIDR block fully contains another.
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
 * import { cidrv4ContainsCidr, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assert(cidrv4ContainsCidr(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.1.0.0/16")));
 * assert(cidrv4ContainsCidr(parseCidrv4("192.168.0.0/16"), parseCidrv4("192.168.1.0/24")));
 * assertEquals(cidrv4ContainsCidr(parseCidrv4("192.168.1.0/24"), parseCidrv4("192.168.0.0/16")), false);
 * ```
 *
 * @example Equal CIDRs contain each other
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv4ContainsCidr, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/24");
 * assert(cidrv4ContainsCidr(cidr, cidr));
 * ```
 *
 * @example /0 contains everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv4ContainsCidr, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const all = parseCidrv4("0.0.0.0/0");
 * assert(cidrv4ContainsCidr(all, parseCidrv4("192.168.1.0/24")));
 * assert(cidrv4ContainsCidr(all, parseCidrv4("10.0.0.1/32")));
 * ```
 */
export function cidrv4ContainsCidr(outer: Cidrv4, inner: Cidrv4): boolean {
  if (outer.prefixLength > inner.prefixLength) return false;
  const outerMask = cidrv4Mask(outer.prefixLength);
  return ((outer.address & outerMask) >>> 0) ===
    ((inner.address & outerMask) >>> 0);
}

/**
 * Checks if two IPv4 CIDR blocks overlap (share at least one address).
 *
 * Two CIDRs overlap when one contains at least one address of the other.
 * This is equivalent to checking containment using the shorter prefix.
 * The check is symmetric: `cidrv4Overlaps(a, b) === cidrv4Overlaps(b, a)`.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if the two CIDR ranges share at least one address
 *
 * @example Overlapping CIDRs
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Overlaps, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assert(cidrv4Overlaps(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.1.0.0/16")));
 * assert(cidrv4Overlaps(parseCidrv4("10.1.0.0/16"), parseCidrv4("10.0.0.0/8")));
 * assert(cidrv4Overlaps(parseCidrv4("192.168.1.0/24"), parseCidrv4("192.168.1.0/24")));
 * assertEquals(cidrv4Overlaps(parseCidrv4("10.0.0.0/8"), parseCidrv4("172.16.0.0/12")), false);
 * ```
 *
 * @example /0 overlaps everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv4Overlaps, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const all = parseCidrv4("0.0.0.0/0");
 * assert(cidrv4Overlaps(all, parseCidrv4("192.168.1.0/24")));
 * assert(cidrv4Overlaps(all, parseCidrv4("10.0.0.1/32")));
 * ```
 *
 * @example Adjacent but non-overlapping
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Overlaps, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Overlaps(parseCidrv4("192.168.0.0/24"), parseCidrv4("192.168.1.0/24")), false);
 * ```
 */
export function cidrv4Overlaps(a: Cidrv4, b: Cidrv4): boolean {
  const minPrefix = Math.min(a.prefixLength, b.prefixLength);
  const mask = cidrv4Mask(minPrefix);
  return ((a.address & mask) >>> 0) === ((b.address & mask) >>> 0);
}

/**
 * Splits an IPv4 CIDR block into its two half-sized children at prefix+1.
 *
 * @param cidr The CIDR block to split
 * @returns A tuple of the lower and upper halves
 */
function cidrv4SplitHalves(cidr: Cidrv4): [Cidrv4, Cidrv4] {
  const newPrefix = cidr.prefixLength + 1;
  const network = cidrv4FirstAddress(cidr);
  const lower: Cidrv4 = { address: network, prefixLength: newPrefix };
  const upper: Cidrv4 = {
    address: (network | (1 << (31 - cidr.prefixLength))) >>> 0,
    prefixLength: newPrefix,
  };
  return [lower, upper];
}

/**
 * Returns the intersection of two IPv4 CIDR blocks.
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
 * import { cidrv4Intersect, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Intersect(
 *   parseCidrv4("192.168.1.0/24"),
 *   parseCidrv4("192.168.1.0/28"),
 * );
 * assertEquals(result && stringifyCidrv4(result), "192.168.1.0/28");
 * ```
 *
 * @example No overlap returns null
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Intersect, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Intersect(
 *   parseCidrv4("10.0.0.0/8"),
 *   parseCidrv4("172.16.0.0/12"),
 * ), null);
 * ```
 */
export function cidrv4Intersect(a: Cidrv4, b: Cidrv4): Cidrv4 | null {
  if (!cidrv4Overlaps(a, b)) return null;
  if (a.prefixLength >= b.prefixLength) {
    return { address: cidrv4FirstAddress(a), prefixLength: a.prefixLength };
  }
  return { address: cidrv4FirstAddress(b), prefixLength: b.prefixLength };
}

/**
 * Subtracts one IPv4 CIDR block from another.
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
 * @example Carve a /28 from a /24
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("192.168.1.0/24"),
 *   parseCidrv4("192.168.1.0/28"),
 * );
 * assertEquals(result.map(stringifyCidrv4), [
 *   "192.168.1.128/25",
 *   "192.168.1.64/26",
 *   "192.168.1.32/27",
 *   "192.168.1.16/28",
 * ]);
 * ```
 *
 * @example No overlap -- original returned unchanged
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("10.0.0.0/24"),
 *   parseCidrv4("172.16.0.0/24"),
 * );
 * assertEquals(result.map(stringifyCidrv4), ["10.0.0.0/24"]);
 * ```
 *
 * @example Full containment -- empty result
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("192.168.1.0/28"),
 *   parseCidrv4("192.168.1.0/24"),
 * );
 * assertEquals(result, []);
 * ```
 */
export function cidrv4Subtract(a: Cidrv4, b: Cidrv4): Cidrv4[] {
  if (!cidrv4Overlaps(a, b)) return [a];
  if (cidrv4ContainsCidr(b, a)) return [];
  const [lower, upper] = cidrv4SplitHalves(a);
  return [...cidrv4Subtract(upper, b), ...cidrv4Subtract(lower, b)];
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
 * from the offset to the boundary (broadcast for positive step, network for negative step).
 *
 * @param cidr The CIDR block to generate addresses from
 * @param options Optional configuration for address generation
 * @param options.offset The offset from the network address (0-based, defaults to 0 for network address)
 * @param options.count The maximum number of addresses to generate (defaults to undefined = iterate until CIDR boundary)
 * @param options.step The increment between addresses (positive or negative, defaults to 1)
 * @returns A generator yielding IP addresses as 32-bit unsigned integers (may yield less than count if CIDR boundary is reached)
 *
 * @example Default behavior - iterate full CIDR range
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: .0 to .7
 *
 * // By default, iterates from offset 0 (network address) to CIDR boundary
 * const all = Array.from(cidrv4Addresses(cidr));
 * assertEquals(all.map(stringifyIpv4), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 * assertEquals(all.length, 8); // All 8 IPs in /29
 *
 * // Skip network address by specifying offset 1
 * const usable = Array.from(cidrv4Addresses(cidr, { offset: 1 }));
 * assertEquals(usable.length, 7); // Skip network address
 * ```
 *
 * @example Limiting with count parameter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // Get first 3 IPs starting at network address
 * const first3 = Array.from(cidrv4Addresses(cidr, { offset: 0, count: 3 }));
 * assertEquals(first3, [
 *   parseIpv4("192.168.1.0"),
 *   parseIpv4("192.168.1.1"),
 *   parseIpv4("192.168.1.2"),
 * ]);
 *
 * // Get 5 IPs starting at offset 10
 * const offset10 = Array.from(cidrv4Addresses(cidr, { offset: 10, count: 5 }));
 * assertEquals(offset10[0], parseIpv4("192.168.1.10"));
 * assertEquals(offset10[4], parseIpv4("192.168.1.14"));
 * ```
 *
 * @example Custom step for even/odd IPs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // Get every other IP (even addresses)
 * const evenIps = Array.from(cidrv4Addresses(cidr, { offset: 0, count: 5, step: 2 }));
 * assertEquals(evenIps, [
 *   parseIpv4("192.168.1.0"),
 *   parseIpv4("192.168.1.2"),
 *   parseIpv4("192.168.1.4"),
 *   parseIpv4("192.168.1.6"),
 *   parseIpv4("192.168.1.8"),
 * ]);
 *
 * // Get odd addresses
 * const oddIps = Array.from(cidrv4Addresses(cidr, { offset: 1, count: 5, step: 2 }));
 * assertEquals(oddIps[0], parseIpv4("192.168.1.1"));
 * assertEquals(oddIps[1], parseIpv4("192.168.1.3"));
 * ```
 *
 * @example Negative step for reverse iteration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // Get 5 IPs counting backwards from offset 10
 * const backwards = Array.from(cidrv4Addresses(cidr, { offset: 10, count: 5, step: -1 }));
 * assertEquals(backwards, [
 *   parseIpv4("192.168.1.10"),
 *   parseIpv4("192.168.1.9"),
 *   parseIpv4("192.168.1.8"),
 *   parseIpv4("192.168.1.7"),
 *   parseIpv4("192.168.1.6"),
 * ]);
 * ```
 *
 * @example CIDR boundary handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/29"); // Only 8 IPs: .0 to .7
 *
 * // Requesting more IPs than available stops at CIDR boundary
 * const ips = Array.from(cidrv4Addresses(cidr, { offset: 5, count: 10, step: 1 }));
 * assertEquals(ips.length, 3); // Only .5, .6, .7 are in range
 *
 * // Negative step stops at CIDR start
 * const reverseIps = Array.from(cidrv4Addresses(cidr, { offset: 3, count: 10, step: -1 }));
 * assertEquals(reverseIps.length, 4); // .3, .2, .1, .0
 * ```
 */
export function* cidrv4Addresses(
  cidr: Cidrv4,
  options?: {
    offset?: number;
    count?: number;
    step?: number;
  },
): Generator<number> {
  const network = cidrv4NetworkAddress(cidr);
  const offset = options?.offset ?? 0;
  const count = options?.count;
  const step = options?.step ?? 1;

  let currentIp = (network + offset) >>> 0;
  const maxCount = count !== undefined ? count : Infinity;

  let i = 0;
  while (i < maxCount && cidrv4Contains(cidr, currentIp)) {
    yield currentIp;
    currentIp = (currentIp + step) >>> 0;
    i++;
  }
}

/**
 * Checks if two IPv4 CIDR blocks are sibling halves of the same parent block.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if a and b are siblings
 */
function cidrv4AreSiblings(a: Cidrv4, b: Cidrv4): boolean {
  if (a.prefixLength !== b.prefixLength || a.prefixLength === 0) return false;
  const parentMask = cidrv4Mask(a.prefixLength - 1);
  return ((a.address & parentMask) >>> 0) === ((b.address & parentMask) >>> 0);
}

/**
 * Merges IPv4 CIDR blocks into the minimal covering set.
 *
 * Takes an array of possibly overlapping, adjacent, or redundant CIDR
 * blocks and returns the minimal set of non-overlapping CIDR prefix
 * blocks covering the exact same address space.
 *
 * @param cidrs The CIDR blocks to merge
 * @returns Minimal set of non-overlapping CIDR blocks, sorted by address
 *
 * @example Compact a firewall allowlist
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Merge, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const rules = [
 *   parseCidrv4("10.0.1.0/24"),
 *   parseCidrv4("10.0.0.0/24"),
 *   parseCidrv4("10.0.0.128/25"),
 * ];
 * const compacted = cidrv4Merge(rules);
 * assertEquals(compacted.map(stringifyCidrv4), ["10.0.0.0/23"]);
 * ```
 *
 * @example Aggregate routes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Merge, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const routes = [
 *   parseCidrv4("198.51.100.0/25"),
 *   parseCidrv4("198.51.100.128/26"),
 *   parseCidrv4("198.51.100.192/26"),
 *   parseCidrv4("203.0.113.0/24"),
 * ];
 * assertEquals(cidrv4Merge(routes).map(stringifyCidrv4), [
 *   "198.51.100.0/24",
 *   "203.0.113.0/24",
 * ]);
 * ```
 */
export function cidrv4Merge(cidrs: readonly Cidrv4[]): Cidrv4[] {
  if (cidrs.length === 0) return [];

  // Step 1: Normalize - apply mask to get canonical network addresses
  let list: Cidrv4[] = cidrs.map((cidr) => ({
    address: cidrv4FirstAddress(cidr),
    prefixLength: cidr.prefixLength,
  }));

  // Step 2: Sort by (address ascending, prefixLength ascending)
  list.sort((a, b) => a.address - b.address || a.prefixLength - b.prefixLength);

  // Step 3: Remove contained blocks
  const deduped: Cidrv4[] = [];
  let currentLast = -1;
  for (const cidr of list) {
    const last = cidrv4LastAddress(cidr);
    if (last <= currentLast) continue;
    deduped.push(cidr);
    currentLast = last;
  }
  list = deduped;

  // Step 4: Merge adjacent siblings iteratively until stable
  let changed = true;
  while (changed) {
    changed = false;
    const merged: Cidrv4[] = [];
    let i = 0;
    while (i < list.length) {
      if (
        i + 1 < list.length && cidrv4AreSiblings(list[i], list[i + 1])
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
