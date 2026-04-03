/**
 * IPv4 and IPv6 address parsing, stringifying, and CIDR utilities.
 *
 * This module provides functions for working with IPv4 and IPv6 addresses and CIDR notation.
 * IPv4 addresses are represented as numbers (32-bit), IPv6 as bigints (128-bit), enabling
 * efficient arithmetic operations and range manipulation for network programming tasks.
 *
 * ## API Reference
 *
 * ### Universal (auto-detect IPv4/IPv6)
 * - {@link parseIp}: Parse any IP address string to number (IPv4) or bigint (IPv6)
 * - {@link stringifyIp}: Convert number or bigint to IP address string
 * - {@link parseCidr}: Parse any CIDR notation string to Cidrv4 or Cidrv6
 * - {@link stringifyCidr}: Convert Cidrv4 or Cidrv6 to CIDR notation string
 * - {@link isValidCidr}: Check if a string is valid CIDR notation (IPv4 or IPv6)
 *
 * ### IPv4
 * - {@link parseIpv4}: Parse dotted decimal notation to number
 * - {@link stringifyIpv4}: Convert number to dotted decimal notation
 * - {@link isValidIpv4}: Check if a string is a valid IPv4 address
 *
 * ### IPv4 CIDR
 * - {@link Cidrv4}: Type representing an IPv4 CIDR block
 * - {@link parseCidrv4}: Parse CIDR notation string to Cidrv4
 * - {@link stringifyCidrv4}: Convert Cidrv4 to CIDR notation string
 * - {@link cidrv4Mask}: Create network mask from prefix length (0-32)
 * - {@link cidrv4Contains}: Check if IP is within CIDR range
 * - {@link cidrv4FirstAddress}: Get first address in CIDR range
 * - {@link cidrv4LastAddress}: Get last address in CIDR range
 * - {@link cidrv4NetworkAddress}: Alias for cidrv4FirstAddress
 * - {@link cidrv4BroadcastAddress}: Alias for cidrv4LastAddress
 * - {@link cidrv4Size}: Get total number of addresses in CIDR range
 * - {@link cidrv4Addresses}: Generate IP addresses in CIDR range
 * - {@link isValidCidrv4}: Check if a string is valid IPv4 CIDR notation
 *
 * ### IPv6
 * - {@link parseIpv6}: Parse colon-hexadecimal notation to bigint
 * - {@link stringifyIpv6}: Convert bigint to compressed colon-hexadecimal
 * - {@link expandIpv6}: Expand to full uncompressed form
 * - {@link compressIpv6}: Compress to canonical shortest form
 * - {@link isValidIpv6}: Check if a string is a valid IPv6 address
 *
 * ### IPv6 CIDR
 * - {@link Cidrv6}: Type representing an IPv6 CIDR block
 * - {@link parseCidrv6}: Parse CIDR notation string to Cidrv6
 * - {@link stringifyCidrv6}: Convert Cidrv6 to CIDR notation string
 * - {@link cidrv6Mask}: Create network mask from prefix length (0-128)
 * - {@link cidrv6Contains}: Check if IP is within CIDR range
 * - {@link cidrv6FirstAddress}: Get first address in CIDR range
 * - {@link cidrv6LastAddress}: Get last address in CIDR range
 * - {@link cidrv6Size}: Get total number of addresses in CIDR range
 * - {@link cidrv6Addresses}: Generate IP addresses in CIDR range
 * - {@link isValidCidrv6}: Check if a string is valid IPv6 CIDR notation
 *
 * ### Validation
 * - {@link ValidateIpResult}: Discriminated union type for validation results
 * - {@link isValidIp}: Check if a string is any valid IP address or CIDR notation
 * - {@link validateIp}: Identify and parse any IP address or CIDR string
 *
 * ### IPv4 Classification
 * - {@link ClassifyIpv4Result}: Type for all IPv4 classification labels
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
 * - {@link ClassifyIpv6Result}: Type for all IPv6 classification labels
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
 * - {@link ClassifyIpResult}: Union type of all classification labels
 * - {@link classifyIp}: Classify an IPv4 (number) or IPv6 (bigint) address
 *
 * ### Submodules
 * - [`ip`](https://jsr.io/@hertzg/ip/doc/ip): Universal IP parsing via {@link parseIp}, {@link stringifyIp}
 * - [`cidr`](https://jsr.io/@hertzg/ip/doc/cidr): Universal CIDR parsing via {@link parseCidr}, {@link stringifyCidr}
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/ipv4): IPv4 parsing and validation
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): IPv4 CIDR utilities and validation
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/ipv6): IPv6 parsing and validation
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): IPv6 CIDR utilities and validation
 * - [`classify`](https://jsr.io/@hertzg/ip/doc/classify): Universal classifier via {@link classifyIp}
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): IPv4 classification via {@link classifyIpv4}, {@link isIpv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): IPv6 classification via {@link classifyIpv6}, {@link isIpv6Loopback}, etc.
 * - [`validate`](https://jsr.io/@hertzg/ip/doc/validate): Universal validation via {@link isValidIp}, {@link validateIp}
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
 * - **Validation**: Non-throwing validity checks and universal string identification
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
 *   cidrv4BroadcastAddress,
 *   cidrv4NetworkAddress,
 *   parseCidrv4,
 *   stringifyCidrv4,
 *   stringifyIpv4,
 * } from "@hertzg/ip";
 *
 * // Parse CIDR notation
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidr.prefixLength, 24);
 *
 * // Get network boundaries
 * const network = cidrv4NetworkAddress(cidr);
 * assertEquals(stringifyIpv4(network), "192.168.1.0");
 *
 * const broadcast = cidrv4BroadcastAddress(cidr);
 * assertEquals(stringifyIpv4(broadcast), "192.168.1.255");
 *
 * // Stringify back to CIDR notation
 * assertEquals(stringifyCidrv4(cidr), "192.168.1.0/24");
 * ```
 *
 * @example IPv6 CIDR operations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidrv6FirstAddress,
 *   cidrv6LastAddress,
 *   parseCidrv6,
 *   stringifyCidrv6,
 *   stringifyIpv6,
 * } from "@hertzg/ip";
 *
 * // Parse IPv6 CIDR notation
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(cidr.prefixLength, 32);
 *
 * // Get range boundaries
 * const first = cidrv6FirstAddress(cidr);
 * assertEquals(stringifyIpv6(first), "2001:db8::");
 *
 * // Stringify back to CIDR notation
 * assertEquals(stringifyCidrv6(cidr), "2001:db8::/32");
 * ```
 *
 * ## Range Checking
 *
 * @example Check if IPs are within CIDR range
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4, parseIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // IPs within range
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.0")));   // network address
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.100"))); // middle of range
 * assert(cidrv4Contains(cidr, parseIpv4("192.168.1.255"))); // broadcast address
 *
 * // IPs outside range
 * assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.0.255")), false);
 * assertEquals(cidrv4Contains(cidr, parseIpv4("192.168.2.0")), false);
 * ```
 *
 * ## Address Generation
 *
 * @example Generate IP ranges with custom patterns
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4, stringifyIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: .0 to .7
 *
 * // By default, iterates all IPs (offset=0, step=1, no count limit)
 * const all = Array.from(cidrv4Addresses(cidr));
 * assertEquals(all.map(stringifyIpv4), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 *
 * // Skip network address with offset=1
 * const usable = Array.from(cidrv4Addresses(cidr, { offset: 1 }));
 * assertEquals(usable.length, 7);
 *
 * // Get even addresses (step=2)
 * const evenIps = Array.from(cidrv4Addresses(cidr, { step: 2 }));
 * assertEquals(evenIps.map(stringifyIpv4), ["10.0.0.0", "10.0.0.2", "10.0.0.4", "10.0.0.6"]);
 *
 * // Reverse iteration from offset (negative step)
 * const backwards = Array.from(cidrv4Addresses(cidr, { offset: 5, step: -1 }));
 * assertEquals(backwards.map(stringifyIpv4), ["10.0.0.5", "10.0.0.4", "10.0.0.3", "10.0.0.2", "10.0.0.1", "10.0.0.0"]);
 * ```
 *
 * ## Real-World Use Cases
 *
 * @example IP address allocation system
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidrv4Addresses,
 *   cidrv4Contains,
 *   parseCidrv4,
 *   stringifyIpv4,
 * } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/24");
 *
 * // Allocate batch of IPs for servers
 * const serverIps = Array.from(cidrv4Addresses(cidr, { offset: 10, count: 5, step: 1 }));
 *
 * // Verify all allocated IPs are in range
 * for (const ip of serverIps) {
 *   assert(cidrv4Contains(cidr, ip));
 * }
 *
 * // Convert to strings for configuration
 * const serverAddresses = serverIps.map(stringifyIpv4);
 * assert(serverAddresses[0] === "10.0.0.10");
 * ```
 *
 * @example Memory-efficient iteration over large ranges
 * ```ts
 * import { cidrv4Addresses, parseCidrv4, stringifyIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/16"); // 65,536 addresses
 *
 * // Process entire CIDR lazily without loading all into memory
 * // No need to specify count - iterates until CIDR boundary
 * for (const ip of cidrv4Addresses(cidr, { offset: 0 })) {
 *   const ipStr = stringifyIpv4(ip);
 *   // Process each IP (e.g., scan, allocate, log)
 *   break; // Just showing the pattern
 * }
 * ```
 *
 * @example WireGuard mesh network with IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6, stringifyIpv6 } from "@hertzg/ip";
 *
 * // Allocate unique local addresses for mesh peers
 * const meshSubnet = parseCidrv6("fd00:abcd::/120");
 *
 * // Get addresses for mesh nodes
 * const peerAddresses = Array.from(cidrv6Addresses(meshSubnet, { offset: 1, count: 5 }));
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

// --- Universal (auto-detect IPv4/IPv6) ---

export { parseIp, stringifyIp } from "./ip.ts";
export { isValidCidr, parseCidr, stringifyCidr } from "./cidr.ts";
export { classifyIp, type ClassifyIpResult } from "./classify.ts";
export {
  type ValidateIpResult,
  isValidIp,
  validateIp,
} from "./validate.ts";

// --- IPv4 ---

export { isValidIpv4, parseIpv4, stringifyIpv4 } from "./ipv4.ts";

export {
  type Cidrv4,
  cidrv4Addresses,
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4FirstAddress,
  cidrv4LastAddress,
  cidrv4NetworkAddress,
  cidrv4Size,
  isValidCidrv4,
  cidrv4Mask,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";

export {
  classifyIpv4,
  type ClassifyIpv4Result,
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

// --- IPv6 ---

export {
  compressIpv6,
  expandIpv6,
  isValidIpv6,
  parseIpv6,
  stringifyIpv6,
} from "./ipv6.ts";

export {
  type Cidrv6,
  cidrv6Addresses,
  cidrv6Contains,
  cidrv6FirstAddress,
  cidrv6LastAddress,
  cidrv6Size,
  isValidCidrv6,
  cidrv6Mask,
  parseCidrv6,
  stringifyCidrv6,
} from "./cidrv6.ts";

export {
  classifyIpv6,
  type ClassifyIpv6Result,
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
