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
 *   cidr4BroadcastAddress,
 *   cidr4Contains,
 *   cidr4NetworkAddress,
 *   parseCidr4,
 * } from "@hertzg/ip/cidrv4";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 * let currentIp = cidr4NetworkAddress(cidr) + 1;
 *
 * while (cidr4Contains(cidr, currentIp)) {
 *   const assigned = stringifyIpv4(currentIp);
 *   currentIp = currentIp + 1;
 *   if (currentIp > cidr4BroadcastAddress(cidr)) break;
 * }
 *
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.1")));
 * assertEquals(cidr4Contains(cidr, parseIpv4("192.168.2.1")), false);
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
export type Cidr4 = {
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
 * import { maskFromPrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(maskFromPrefixLength(24), 0xFFFFFF00);
 * assertEquals(maskFromPrefixLength(16), 0xFFFF0000);
 * assertEquals(maskFromPrefixLength(8), 0xFF000000);
 * assertEquals(maskFromPrefixLength(32), 0xFFFFFFFF);
 * assertEquals(maskFromPrefixLength(0), 0);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { maskFromPrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => maskFromPrefixLength(-1), RangeError);
 * assertThrows(() => maskFromPrefixLength(33), RangeError);
 * ```
 */
export function maskFromPrefixLength(prefixLength: number): number {
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
 * Parses an IPv4 CIDR notation string to a Cidr4 object.
 *
 * Returns only the parsed values (address and prefix length).
 *
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns A Cidr4 object containing the parsed address and prefix length
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If the prefix length is out of range (not 0-32)
 * @throws Propagates errors from parseIpv4 if the address part is invalid
 *
 * @example Basic CIDR parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 * assertEquals(cidr.address, 3232235776);
 * assertEquals(cidr.prefixLength, 24);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidr4 } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => parseCidr4("192.168.1.0"), TypeError);
 * assertThrows(() => parseCidr4("192.168.1.0/"), TypeError);
 * assertThrows(() => parseCidr4("192.168.1.0/33"), RangeError);
 * assertThrows(() => parseCidr4("256.0.0.0/24"), RangeError);
 * ```
 */
export function parseCidr4(cidr: string): Cidr4 {
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
  maskFromPrefixLength(prefixLength);

  return {
    address,
    prefixLength,
  };
}

/**
 * Stringifies a Cidr4 object to CIDR notation.
 *
 * @param cidr The Cidr4 object to stringify
 * @returns The CIDR notation string (e.g., "192.168.1.0/24")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr4, stringifyCidr4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 * assertEquals(stringifyCidr4(cidr), "192.168.1.0/24");
 * ```
 */
export function stringifyCidr4(cidr: Cidr4): string {
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
 * import { cidr4Contains, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 *
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.0")));
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.100")));
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.255")));
 * assertEquals(cidr4Contains(cidr, parseIpv4("192.168.2.1")), false);
 * assertEquals(cidr4Contains(cidr, parseIpv4("192.168.0.255")), false);
 * ```
 *
 * @example IP assignment workflow
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidr4BroadcastAddress,
 *   cidr4Contains,
 *   cidr4NetworkAddress,
 *   parseCidr4,
 * } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidr4("10.0.0.0/29");
 * let currentIp = cidr4NetworkAddress(cidr) + 1;
 *
 * const assigned: number[] = [];
 * while (currentIp < cidr4BroadcastAddress(cidr)) {
 *   assert(cidr4Contains(cidr, currentIp));
 *   assigned.push(currentIp);
 *   currentIp = currentIp + 1;
 * }
 * ```
 */
export function cidr4Contains(cidr: Cidr4, ip: number): boolean {
  const mask = maskFromPrefixLength(cidr.prefixLength);
  const network = (cidr.address & mask) >>> 0;
  return ((ip & mask) >>> 0) === network;
}

/**
 * Returns the network address (first IP) of a CIDR block.
 *
 * @param cidr The CIDR block
 * @returns The network address as a 32-bit unsigned integer
 *
 * @example Getting network address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4NetworkAddress, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 * assertEquals(cidr4NetworkAddress(cidr), parseIpv4("192.168.1.0"));
 * ```
 */
export function cidr4NetworkAddress(cidr: Cidr4): number {
  const mask = maskFromPrefixLength(cidr.prefixLength);
  return (cidr.address & mask) >>> 0;
}

/**
 * Returns the broadcast address (last IP) of a CIDR block.
 *
 * @param cidr The CIDR block
 * @returns The broadcast address as a 32-bit unsigned integer
 *
 * @example Getting broadcast address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4BroadcastAddress, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 * assertEquals(cidr4BroadcastAddress(cidr), parseIpv4("192.168.1.255"));
 * ```
 */
export function cidr4BroadcastAddress(cidr: Cidr4): number {
  const mask = maskFromPrefixLength(cidr.prefixLength);
  const network = (cidr.address & mask) >>> 0;
  return (network | (~mask >>> 0)) >>> 0;
}

/**
 * Returns the total number of IP addresses in a CIDR block or for a given prefix length.
 *
 * For a /24 network, this returns 256. For a /32, this returns 1.
 *
 * @param cidr The CIDR block
 * @returns The total number of addresses in the CIDR range
 *
 * @example Getting CIDR size from Cidr4 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Size, parseCidr4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidr4Size(parseCidr4("192.168.1.0/24")), 256);
 * assertEquals(cidr4Size(parseCidr4("10.0.0.0/8")), 16777216);
 * assertEquals(cidr4Size(parseCidr4("192.168.1.1/32")), 1);
 * assertEquals(cidr4Size(parseCidr4("0.0.0.0/0")), 4294967296);
 * ```
 *
 * @example Getting CIDR size from prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Size } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidr4Size(24), 256);
 * assertEquals(cidr4Size(8), 16777216);
 * assertEquals(cidr4Size(32), 1);
 * assertEquals(cidr4Size(0), 4294967296);
 * ```
 *
 * @example Error handling for invalid prefix length
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidr4Size } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidr4Size(-1), RangeError);
 * assertThrows(() => cidr4Size(33), RangeError);
 * ```
 */
export function cidr4Size(cidr: Cidr4): number;
export function cidr4Size(prefixLength: number): number;
export function cidr4Size(cidrOrPrefixLength: Cidr4 | number): number {
  const prefixLength = typeof cidrOrPrefixLength === "number"
    ? cidrOrPrefixLength
    : cidrOrPrefixLength.prefixLength;

  if (prefixLength < 0 || prefixLength > 32 || !Number.isInteger(prefixLength)) {
    throw new RangeError(
      `CIDR prefix length must be 0-32, got ${prefixLength}`,
    );
  }

  return 2 ** (32 - prefixLength);
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
 * @param options.offset The offset from the network address (0-based, defaults to 1 for first usable IP)
 * @param options.count The maximum number of addresses to generate (defaults to undefined = iterate until CIDR boundary)
 * @param options.step The increment between addresses (positive or negative, defaults to 1)
 * @returns A generator yielding IP addresses as 32-bit unsigned integers (may yield less than count if CIDR boundary is reached)
 *
 * @example Default behavior - iterate full CIDR range
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Addresses, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("10.0.0.0/29"); // 8 IPs: .0 to .7
 *
 * // By default, iterates from offset 1 (first usable) to CIDR boundary
 * const allUsable = Array.from(cidr4Addresses(cidr));
 * assertEquals(allUsable.map(stringifyIpv4), [
 *   "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 *
 * // Iterate from network address through entire range
 * const all = Array.from(cidr4Addresses(cidr, { offset: 0 }));
 * assertEquals(all.length, 8); // All 8 IPs in /29
 * ```
 *
 * @example Limiting with count parameter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Addresses, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 *
 * // Get first 3 IPs starting at network address
 * const first3 = Array.from(cidr4Addresses(cidr, { offset: 0, count: 3 }));
 * assertEquals(first3, [
 *   parseIpv4("192.168.1.0"),
 *   parseIpv4("192.168.1.1"),
 *   parseIpv4("192.168.1.2"),
 * ]);
 *
 * // Get 5 IPs starting at offset 10
 * const offset10 = Array.from(cidr4Addresses(cidr, { offset: 10, count: 5 }));
 * assertEquals(offset10[0], parseIpv4("192.168.1.10"));
 * assertEquals(offset10[4], parseIpv4("192.168.1.14"));
 * ```
 *
 * @example Custom step for even/odd IPs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Addresses, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 *
 * // Get every other IP (even addresses)
 * const evenIps = Array.from(cidr4Addresses(cidr, { offset: 0, count: 5, step: 2 }));
 * assertEquals(evenIps, [
 *   parseIpv4("192.168.1.0"),
 *   parseIpv4("192.168.1.2"),
 *   parseIpv4("192.168.1.4"),
 *   parseIpv4("192.168.1.6"),
 *   parseIpv4("192.168.1.8"),
 * ]);
 *
 * // Get odd addresses
 * const oddIps = Array.from(cidr4Addresses(cidr, { offset: 1, count: 5, step: 2 }));
 * assertEquals(oddIps[0], parseIpv4("192.168.1.1"));
 * assertEquals(oddIps[1], parseIpv4("192.168.1.3"));
 * ```
 *
 * @example Negative step for reverse iteration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Addresses, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 *
 * // Get 5 IPs counting backwards from offset 10
 * const backwards = Array.from(cidr4Addresses(cidr, { offset: 10, count: 5, step: -1 }));
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
 * import { assert, assertEquals } from "@std/assert";
 * import { cidr4Addresses, parseCidr4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidr4("192.168.1.0/29"); // Only 8 IPs: .0 to .7
 *
 * // Requesting more IPs than available stops at CIDR boundary
 * const ips = Array.from(cidr4Addresses(cidr, { offset: 5, count: 10, step: 1 }));
 * assertEquals(ips.length, 3); // Only .5, .6, .7 are in range
 *
 * // Negative step stops at CIDR start
 * const reverseIps = Array.from(cidr4Addresses(cidr, { offset: 3, count: 10, step: -1 }));
 * assertEquals(reverseIps.length, 4); // .3, .2, .1, .0
 * ```
 *
 * @example Memory-efficient iteration over large ranges
 * ```ts
 * import { cidr4Addresses, parseCidr4 } from "@hertzg/ip/cidrv4";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const cidr = parseCidr4("10.0.0.0/16"); // 65,536 IPs
 *
 * // Process IPs without loading all into memory
 * for (const ip of cidr4Addresses(cidr, { offset: 0, count: 65536, step: 1 })) {
 *   const ipStr = stringifyIpv4(ip);
 *   // Process each IP...
 * }
 * ```
 */
export function* cidr4Addresses(
  cidr: Cidr4,
  options?: {
    offset?: number;
    count?: number;
    step?: number;
  },
): Generator<number> {
  const network = cidr4NetworkAddress(cidr);
  const offset = options?.offset ?? 1;
  const count = options?.count;
  const step = options?.step ?? 1;

  let currentIp = (network + offset) >>> 0;
  const maxCount = count !== undefined ? count : Infinity;

  let i = 0;
  while (i < maxCount && cidr4Contains(cidr, currentIp)) {
    yield currentIp;
    currentIp = (currentIp + step) >>> 0;
    i++;
  }
}
