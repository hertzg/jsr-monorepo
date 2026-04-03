/**
 * IPv4 and IPv6 address parsing, stringifying, and CIDR utilities.
 *
 * This module provides functions for working with IPv4 and IPv6 addresses and CIDR notation.
 * IPv4 addresses are represented as numbers (32-bit), IPv6 as bigints (128-bit), enabling
 * efficient arithmetic operations and range manipulation for network programming tasks.
 *
 * ## API Reference
 *
 * ### IPv4
 * - {@link parseIpv4}: Parse dotted decimal notation to number
 * - {@link stringifyIpv4}: Convert number to dotted decimal notation
 *
 * ### IPv4 CIDR
 * - {@link Cidr4}: Type representing an IPv4 CIDR block
 * - {@link parseCidr4}: Parse CIDR notation string to Cidr4
 * - {@link stringifyCidr4}: Convert Cidr4 to CIDR notation string
 * - {@link mask4FromPrefixLength}: Create network mask from prefix length (0-32)
 * - {@link cidr4Contains}: Check if IP is within CIDR range
 * - {@link cidr4FirstAddress}: Get first address in CIDR range
 * - {@link cidr4LastAddress}: Get last address in CIDR range
 * - {@link cidr4NetworkAddress}: Alias for cidr4FirstAddress
 * - {@link cidr4BroadcastAddress}: Alias for cidr4LastAddress
 * - {@link cidr4Size}: Get total number of addresses in CIDR range
 * - {@link cidr4Addresses}: Generate IP addresses in CIDR range
 *
 * ### IPv6
 * - {@link parseIpv6}: Parse colon-hexadecimal notation to bigint
 * - {@link stringifyIpv6}: Convert bigint to compressed colon-hexadecimal
 * - {@link expandIpv6}: Expand to full uncompressed form
 * - {@link compressIpv6}: Compress to canonical shortest form
 *
 * ### IPv6 CIDR
 * - {@link Cidr6}: Type representing an IPv6 CIDR block
 * - {@link parseCidr6}: Parse CIDR notation string to Cidr6
 * - {@link stringifyCidr6}: Convert Cidr6 to CIDR notation string
 * - {@link mask6FromPrefixLength}: Create network mask from prefix length (0-128)
 * - {@link cidr6Contains}: Check if IP is within CIDR range
 * - {@link cidr6FirstAddress}: Get first address in CIDR range
 * - {@link cidr6LastAddress}: Get last address in CIDR range
 * - {@link cidr6Size}: Get total number of addresses in CIDR range
 * - {@link cidr6Addresses}: Generate IP addresses in CIDR range
 *
 * ### IPv4 Classification
 * - {@link Ipv4Classification}: Type for all IPv4 classification labels
 * - {@link classifyIpv4}: Classify an IPv4 address into its well-known range
 * - {@link isIpv4Private}: Check if address is private (RFC 1918)
 * - {@link isIpv4Loopback}: Check if address is loopback (127.0.0.0/8)
 * - {@link isIpv4LinkLocal}: Check if address is link-local (169.254.0.0/16)
 * - {@link isIpv4Multicast}: Check if address is multicast (224.0.0.0/4)
 * - {@link isIpv4Reserved}: Check if address is reserved (240.0.0.0/4)
 * - {@link isIpv4Broadcast}: Check if address is broadcast (255.255.255.255)
 * - {@link isIpv4ThisNetwork}: Check if address is "this network" (0.0.0.0/8)
 * - {@link isIpv4CgNat}: Check if address is Carrier-Grade NAT (100.64.0.0/10)
 * - {@link isIpv4Benchmarking}: Check if address is benchmarking (198.18.0.0/15)
 * - {@link isIpv4Documentation}: Check if address is documentation (RFC 5737)
 * - {@link isIpv4Public}: Check if address is publicly routable
 *
 * ### IPv6 Classification
 * - {@link Ipv6Classification}: Type for all IPv6 classification labels
 * - {@link classifyIpv6}: Classify an IPv6 address into its well-known range
 * - {@link isIpv6Loopback}: Check if address is loopback (::1)
 * - {@link isIpv6Unspecified}: Check if address is unspecified (::)
 * - {@link isIpv6LinkLocal}: Check if address is link-local (fe80::/10)
 * - {@link isIpv6Multicast}: Check if address is multicast (ff00::/8)
 * - {@link isIpv6UniqueLocal}: Check if address is unique local (fc00::/7)
 * - {@link isIpv6GlobalUnicast}: Check if address is global unicast (2000::/3)
 * - {@link isIpv6Ipv4Mapped}: Check if address is IPv4-mapped (::ffff:0:0/96)
 * - {@link isIpv6Ipv4Translated}: Check if address is IPv4-translated (64:ff9b::/96)
 * - {@link isIpv6Documentation}: Check if address is documentation (2001:db8::/32)
 * - {@link isIpv6Teredo}: Check if address is Teredo (2001::/32)
 * - {@link isIpv6Benchmarking}: Check if address is benchmarking (2001:2::/48)
 * - {@link isIpv6Orchidv2}: Check if address is ORCHIDv2 (2001:20::/28)
 *
 * ### Combined Classification
 * - {@link classifyIp}: Classify an IPv4 (number) or IPv6 (bigint) address
 *
 * ### Submodules
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/ipv4): IPv4 parsing via {@link parseIpv4} and {@link stringifyIpv4}
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): IPv4 CIDR utilities via {@link parseCidr4}, {@link cidr4Contains}
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/ipv6): IPv6 parsing via {@link parseIpv6}, {@link expandIpv6}, {@link compressIpv6}
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): IPv6 CIDR utilities via {@link parseCidr6}, {@link cidr6Contains}
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): IPv4 classification via {@link classifyIpv4}, {@link isIpv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): IPv6 classification via {@link classifyIpv6}, {@link isIpv6Loopback}, etc.
 *
 * ## Features
 *
 * - **IPv4 & IPv6 Parsing & Stringifying**: Convert between standard notation and number/bigint
 * - **CIDR Support**: Parse CIDR notation and perform network calculations
 * - **Range Checking**: Verify if IPs are within CIDR blocks
 * - **Address Generation**: Generate IP ranges with custom offsets and steps
 * - **Arithmetic Operations**: Use number (IPv4) or bigint (IPv6) math for IP address manipulation
 * - **IPv6 Compression**: Expand and compress IPv6 addresses
 * - **IP Classification**: Identify private, loopback, multicast, and other well-known ranges
 *
 * ## Basic IPv4 Operations
 *
 * @example Parse and stringify IPv4 addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip";
 *
 * // Parse dotted decimal to number
 * const ip = parseIpv4("192.168.1.1");
 * assertEquals(ip, 3232235777);
 *
 * // Stringify number back to dotted decimal
 * assertEquals(stringifyIpv4(ip), "192.168.1.1");
 *
 * // Arithmetic operations
 * const next = ip + 1;
 * assertEquals(stringifyIpv4(next), "192.168.1.2");
 *
 * const prev = ip - 1;
 * assertEquals(stringifyIpv4(prev), "192.168.1.0");
 * ```
 *
 * ## Basic IPv6 Operations
 *
 * @example Parse and stringify IPv6 addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv6, stringifyIpv6 } from "@hertzg/ip";
 *
 * // Parse colon-hexadecimal to bigint
 * const ip = parseIpv6("2001:db8::1");
 * assertEquals(ip, 42540766411282592856903984951653826561n);
 *
 * // Stringify bigint back to compressed form
 * assertEquals(stringifyIpv6(ip), "2001:db8::1");
 *
 * // Arithmetic operations
 * const next = ip + 1n;
 * assertEquals(stringifyIpv6(next), "2001:db8::2");
 * ```
 *
 * ## CIDR Notation
 *
 * @example Parse and work with CIDR blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidr4BroadcastAddress,
 *   cidr4NetworkAddress,
 *   parseCidr4,
 *   stringifyCidr4,
 *   stringifyIpv4,
 * } from "@hertzg/ip";
 *
 * // Parse CIDR notation
 * const cidr = parseCidr4("192.168.1.0/24");
 * assertEquals(cidr.prefixLength, 24);
 *
 * // Get network boundaries
 * const network = cidr4NetworkAddress(cidr);
 * assertEquals(stringifyIpv4(network), "192.168.1.0");
 *
 * const broadcast = cidr4BroadcastAddress(cidr);
 * assertEquals(stringifyIpv4(broadcast), "192.168.1.255");
 *
 * // Stringify back to CIDR notation
 * assertEquals(stringifyCidr4(cidr), "192.168.1.0/24");
 * ```
 *
 * @example IPv6 CIDR operations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidr6FirstAddress,
 *   cidr6LastAddress,
 *   parseCidr6,
 *   stringifyCidr6,
 *   stringifyIpv6,
 * } from "@hertzg/ip";
 *
 * // Parse IPv6 CIDR notation
 * const cidr = parseCidr6("2001:db8::/32");
 * assertEquals(cidr.prefixLength, 32);
 *
 * // Get range boundaries
 * const first = cidr6FirstAddress(cidr);
 * assertEquals(stringifyIpv6(first), "2001:db8::");
 *
 * // Stringify back to CIDR notation
 * assertEquals(stringifyCidr6(cidr), "2001:db8::/32");
 * ```
 *
 * ## Range Checking
 *
 * @example Check if IPs are within CIDR range
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidr4Contains, parseCidr4, parseIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidr4("192.168.1.0/24");
 *
 * // IPs within range
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.0")));   // network address
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.100"))); // middle of range
 * assert(cidr4Contains(cidr, parseIpv4("192.168.1.255"))); // broadcast address
 *
 * // IPs outside range
 * assertEquals(cidr4Contains(cidr, parseIpv4("192.168.0.255")), false);
 * assertEquals(cidr4Contains(cidr, parseIpv4("192.168.2.0")), false);
 * ```
 *
 * ## Address Generation
 *
 * @example Generate IP ranges with custom patterns
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr4Addresses, parseCidr4, stringifyIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidr4("10.0.0.0/29"); // 8 IPs: .0 to .7
 *
 * // By default, iterates all IPs (offset=0, step=1, no count limit)
 * const all = Array.from(cidr4Addresses(cidr));
 * assertEquals(all.map(stringifyIpv4), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 *
 * // Skip network address with offset=1
 * const usable = Array.from(cidr4Addresses(cidr, { offset: 1 }));
 * assertEquals(usable.length, 7);
 *
 * // Get even addresses (step=2)
 * const evenIps = Array.from(cidr4Addresses(cidr, { step: 2 }));
 * assertEquals(evenIps.map(stringifyIpv4), ["10.0.0.0", "10.0.0.2", "10.0.0.4", "10.0.0.6"]);
 *
 * // Reverse iteration from offset (negative step)
 * const backwards = Array.from(cidr4Addresses(cidr, { offset: 5, step: -1 }));
 * assertEquals(backwards.map(stringifyIpv4), ["10.0.0.5", "10.0.0.4", "10.0.0.3", "10.0.0.2", "10.0.0.1", "10.0.0.0"]);
 * ```
 *
 * ## Real-World Use Cases
 *
 * @example IP address allocation system
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidr4Addresses,
 *   cidr4Contains,
 *   parseCidr4,
 *   stringifyIpv4,
 * } from "@hertzg/ip";
 *
 * const cidr = parseCidr4("10.0.0.0/24");
 *
 * // Allocate batch of IPs for servers
 * const serverIps = Array.from(cidr4Addresses(cidr, { offset: 10, count: 5, step: 1 }));
 *
 * // Verify all allocated IPs are in range
 * for (const ip of serverIps) {
 *   assert(cidr4Contains(cidr, ip));
 * }
 *
 * // Convert to strings for configuration
 * const serverAddresses = serverIps.map(stringifyIpv4);
 * assert(serverAddresses[0] === "10.0.0.10");
 * ```
 *
 * @example Memory-efficient iteration over large ranges
 * ```ts
 * import { cidr4Addresses, parseCidr4, stringifyIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidr4("10.0.0.0/16"); // 65,536 addresses
 *
 * // Process entire CIDR lazily without loading all into memory
 * // No need to specify count - iterates until CIDR boundary
 * for (const ip of cidr4Addresses(cidr, { offset: 0 })) {
 *   const ipStr = stringifyIpv4(ip);
 *   // Process each IP (e.g., scan, allocate, log)
 *   break; // Just showing the pattern
 * }
 * ```
 *
 * @example WireGuard mesh network with IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidr6Addresses, parseCidr6, stringifyIpv6 } from "@hertzg/ip";
 *
 * // Allocate unique local addresses for mesh peers
 * const meshSubnet = parseCidr6("fd00:abcd::/120");
 *
 * // Get addresses for mesh nodes
 * const peerAddresses = Array.from(cidr6Addresses(meshSubnet, { offset: 1, count: 5 }));
 * assertEquals(peerAddresses.map(stringifyIpv6), [
 *   "fd00:abcd::1",
 *   "fd00:abcd::2",
 *   "fd00:abcd::3",
 *   "fd00:abcd::4",
 *   "fd00:abcd::5",
 * ]);
 * ```
 *
 * @module
 */

// Re-export IPv4 utilities
export { parseIpv4, stringifyIpv4 } from "./ipv4.ts";

// Re-export CIDR4 utilities
export {
  type Cidr4,
  cidr4Addresses,
  cidr4BroadcastAddress,
  cidr4Contains,
  cidr4FirstAddress,
  cidr4LastAddress,
  cidr4NetworkAddress,
  cidr4Size,
  mask4FromPrefixLength,
  parseCidr4,
  stringifyCidr4,
} from "./cidrv4.ts";

// Re-export IPv6 utilities
export { compressIpv6, expandIpv6, parseIpv6, stringifyIpv6 } from "./ipv6.ts";

// Re-export CIDR6 utilities
export {
  type Cidr6,
  cidr6Addresses,
  cidr6Contains,
  cidr6FirstAddress,
  cidr6LastAddress,
  cidr6Size,
  mask6FromPrefixLength,
  parseCidr6,
  stringifyCidr6,
} from "./cidrv6.ts";

// Re-export IPv4 classifiers
export {
  classifyIpv4,
  type Ipv4Classification,
  isIpv4Benchmarking,
  isIpv4Broadcast,
  isIpv4CgNat,
  isIpv4Documentation,
  isIpv4LinkLocal,
  isIpv4Loopback,
  isIpv4Multicast,
  isIpv4Private,
  isIpv4Public,
  isIpv4Reserved,
  isIpv4ThisNetwork,
} from "./classifyv4.ts";

// Re-export IPv6 classifiers
export {
  classifyIpv6,
  type Ipv6Classification,
  isIpv6Benchmarking,
  isIpv6Documentation,
  isIpv6GlobalUnicast,
  isIpv6Ipv4Mapped,
  isIpv6Ipv4Translated,
  isIpv6LinkLocal,
  isIpv6Loopback,
  isIpv6Multicast,
  isIpv6Orchidv2,
  isIpv6Teredo,
  isIpv6Unspecified,
  isIpv6UniqueLocal,
} from "./classifyv6.ts";

import { classifyIpv4 } from "./classifyv4.ts";
import type { Ipv4Classification } from "./classifyv4.ts";
import { classifyIpv6 } from "./classifyv6.ts";
import type { Ipv6Classification } from "./classifyv6.ts";

/**
 * Classifies an IPv4 or IPv6 address into its well-known range.
 *
 * Dispatches based on type: `number` for IPv4, `bigint` for IPv6.
 *
 * @param ip The IP address as a number (IPv4) or bigint (IPv6)
 * @returns The classification label
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(classifyIp(parseIpv4("192.168.1.1")), "private");
 * assertEquals(classifyIp(parseIpv4("8.8.8.8")), "public");
 * assertEquals(classifyIp(parseIpv6("::1")), "loopback");
 * assertEquals(classifyIp(parseIpv6("2001:db8::1")), "documentation");
 * ```
 */
export function classifyIp(ip: number): Ipv4Classification;
/**
 * Classifies an IPv6 address into its well-known range.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns The classification label
 */
export function classifyIp(ip: bigint): Ipv6Classification;
export function classifyIp(
  ip: number | bigint,
): Ipv4Classification | Ipv6Classification {
  if (typeof ip === "bigint") {
    return classifyIpv6(ip);
  }
  return classifyIpv4(ip);
}
