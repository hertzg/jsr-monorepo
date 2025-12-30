/**
 * IPv4 address parsing, stringifying, and CIDR utilities.
 *
 * This module provides functions for working with IPv4 addresses and CIDR notation.
 * IP addresses are represented as bigints, enabling efficient arithmetic operations
 * and range manipulation for network programming tasks.
 *
 * ## Features
 *
 * - **IPv4 Parsing & Stringifying**: Convert between dotted decimal notation and bigint
 * - **CIDR Support**: Parse CIDR notation and perform network calculations
 * - **Range Checking**: Verify if IPs are within CIDR blocks
 * - **Address Generation**: Generate IP ranges with custom offsets and steps
 * - **Arithmetic Operations**: Use bigint math for IP address manipulation
 *
 * ## Basic IPv4 Operations
 *
 * @example Parse and stringify IPv4 addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip";
 *
 * // Parse dotted decimal to bigint
 * const ip = parseIpv4("192.168.1.1");
 * assertEquals(ip, 3232235777n);
 *
 * // Stringify bigint back to dotted decimal
 * assertEquals(stringifyIpv4(ip), "192.168.1.1");
 *
 * // Arithmetic operations
 * const next = ip + 1n;
 * assertEquals(stringifyIpv4(next), "192.168.1.2");
 *
 * const prev = ip - 1n;
 * assertEquals(stringifyIpv4(prev), "192.168.1.0");
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
 * // By default, iterates all usable IPs (offset=1, step=1, no count limit)
 * const allUsable = Array.from(cidr4Addresses(cidr));
 * assertEquals(allUsable.map(stringifyIpv4), [
 *   "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 *
 * // Limit with count parameter
 * const first3 = Array.from(cidr4Addresses(cidr, { offset: 0, count: 3 }));
 * assertEquals(first3.length, 3);
 *
 * // Get even addresses (step=2, no count = iterate until boundary)
 * const evenIps = Array.from(cidr4Addresses(cidr, { offset: 0, step: 2 }));
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
 * @module
 */

// Re-export IPv4 utilities
export { parseIpv4, stringifyIpv4 } from "./ipv4.ts";

// Re-export CIDR utilities
export {
  type Cidr4,
  cidr4Addresses,
  cidr4BroadcastAddress,
  cidr4Contains,
  cidr4NetworkAddress,
  maskFromPrefixLength,
  parseCidr4,
  stringifyCidr4,
} from "./cidrv4.ts";
