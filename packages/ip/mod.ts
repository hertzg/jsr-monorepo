/**
 * IPv4 and IPv6 address parsing, stringifying, and CIDR utilities.
 *
 * This module provides functions for working with IPv4 and IPv6 addresses and CIDR notation.
 * IPv4 addresses are represented as numbers (32-bit), IPv6 as bigints (128-bit), enabling
 * efficient arithmetic operations and range manipulation for network programming tasks.
 *
 * ## Features
 *
 * - **Dual-Stack Support**: Auto-unwrap IPv4-mapped IPv6 addresses from dual-stack sockets
 * - **IP Classification**: Identify private, loopback, multicast, public, and other well-known ranges
 * - **CIDR Support**: Parse CIDR notation, check containment, compute network boundaries
 * - **IPv4 & IPv6 Parsing**: Convert between standard notation and number/bigint for arithmetic
 * - **Address Generation**: Lazily enumerate addresses in CIDR ranges
 * - **IPv4-Mapped Conversion**: Convert between IPv4 and IPv4-mapped IPv6 addresses and CIDRs
 * - **Validation**: Non-throwing validity checks for IP addresses and CIDR notation
 *
 * ## Dual-Stack Server
 *
 * @example Normalize client addresses from a dual-stack server
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp, parseIp, stringifyIp } from "@hertzg/ip";
 *
 * // Dual-stack servers (Deno, Node) report IPv4 clients as ::ffff:x.x.x.x
 * // parseIp auto-unwraps mapped addresses to their IPv4 form
 * const remote1 = parseIp("::ffff:192.168.1.50");
 * assertEquals(stringifyIp(remote1), "192.168.1.50");
 *
 * // Native IPv6 clients pass through unchanged
 * const remote2 = parseIp("2001:db8::1");
 * assertEquals(stringifyIp(remote2), "2001:db8::1");
 *
 * // Classification works on both
 * assertEquals(classifyIp(remote1).classification, "private");
 * assertEquals(classifyIp(remote2).classification, "documentation");
 * ```
 *
 * ## Trusted Network Allowlist
 *
 * @example Check if a client IP is in a set of trusted CIDR ranges
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4, parseIp } from "@hertzg/ip";
 *
 * const trustedRanges = [
 *   parseCidrv4("10.0.0.0/8"),
 *   parseCidrv4("172.16.0.0/12"),
 *   parseCidrv4("192.168.0.0/16"),
 * ];
 *
 * function isTrusted(ip: string): boolean {
 *   const addr = parseIp(ip);
 *   if (typeof addr !== "number") return false;
 *   return trustedRanges.some((cidr) => cidrv4Contains(cidr, addr));
 * }
 *
 * assert(isTrusted("192.168.1.100"));
 * assert(isTrusted("10.0.0.1"));
 * assert(isTrusted("::ffff:172.16.5.1"));
 * assertEquals(isTrusted("8.8.8.8"), false);
 * assertEquals(isTrusted("2001:db8::1"), false);
 * ```
 *
 * ## IP Classification
 *
 * @example Classify addresses for logging, analytics, or input validation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip";
 *
 * // Classify any IP — result includes kind, numeric value, and label
 * const result = classifyIp("192.168.1.1");
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.classification, "private");
 *
 * assertEquals(classifyIp("127.0.0.1").classification, "loopback");
 * assertEquals(classifyIp("8.8.8.8").classification, "public");
 * assertEquals(classifyIp("169.254.1.1").classification, "link-local");
 *
 * // Works with IPv6 too
 * assertEquals(classifyIp("::1").classification, "loopback");
 * assertEquals(classifyIp("fe80::1").classification, "link-local");
 * assertEquals(classifyIp("fd00::1").classification, "unique-local");
 *
 * // Use with Zod as a custom validator that accepts allowed classifications:
 * //
 * // import { type ClassificationIpv4, type ClassificationIpv6,
 * //   classifyIp } from "@hertzg/ip";
 * //
 * // function ipClassification(
 * //   ...allowed: (ClassificationIpv4 | ClassificationIpv6)[]
 * // ) {
 * //   const set = new Set(allowed);
 * //   return z.string().refine(
 * //     (val) => set.has(classifyIp(val).classification),
 * //     { message: `IP must be: ${allowed.join(", ")}` },
 * //   );
 * // }
 * //
 * // const publicIp = ipClassification("public", "global-unicast");
 * // publicIp.parse("8.8.8.8");       // ok
 * // publicIp.parse("192.168.1.1");   // throws: private
 * //
 * // const internalIp = ipClassification("private", "loopback");
 * // internalIp.parse("10.0.0.1");    // ok
 * // internalIp.parse("8.8.8.8");     // throws: public
 * ```
 *
 * ## Parsing and Stringifying
 *
 * @example Parse and stringify IPv4 and IPv6 addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4, parseIpv6, stringifyIpv4, stringifyIpv6 } from "@hertzg/ip";
 *
 * // IPv4: string <-> 32-bit number
 * const v4 = parseIpv4("192.168.1.1");
 * assertEquals(v4, 3232235777);
 * assertEquals(stringifyIpv4(v4), "192.168.1.1");
 * assertEquals(stringifyIpv4(v4 + 1), "192.168.1.2");
 *
 * // IPv6: string <-> 128-bit bigint
 * const v6 = parseIpv6("2001:db8::1");
 * assertEquals(v6, 42540766411282592856903984951653826561n);
 * assertEquals(stringifyIpv6(v6), "2001:db8::1");
 * assertEquals(stringifyIpv6(v6 + 1n), "2001:db8::2");
 * ```
 *
 * ## CIDR Network Boundaries
 *
 * @example Compute network and broadcast addresses from CIDR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidrv4BroadcastAddress,
 *   cidrv4NetworkAddress,
 *   cidrv4Size,
 *   parseCidrv4,
 *   stringifyIpv4,
 * } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * assertEquals(stringifyIpv4(cidrv4NetworkAddress(cidr)), "192.168.1.0");
 * assertEquals(stringifyIpv4(cidrv4BroadcastAddress(cidr)), "192.168.1.255");
 * assertEquals(cidrv4Size(cidr), 256);
 * ```
 *
 * ## Range Checking
 *
 * @example Check if IPs fall within a CIDR range
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4, parseIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/8");
 *
 * assert(cidrv4Contains(cidr, parseIpv4("10.0.0.1")));
 * assert(cidrv4Contains(cidr, parseIpv4("10.255.255.255")));
 * assertEquals(cidrv4Contains(cidr, parseIpv4("11.0.0.0")), false);
 * ```
 *
 * ## Subnet Enumeration
 *
 * @example Generate addresses in a CIDR range
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4, stringifyIpv4 } from "@hertzg/ip";
 *
 * const cidr = parseCidrv4("10.0.0.0/29"); // 8 addresses
 *
 * // Iterate all addresses
 * const all = Array.from(cidrv4Addresses(cidr));
 * assertEquals(all.map(stringifyIpv4), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 *
 * // Skip network address, take first 3 usable
 * const usable = Array.from(cidrv4Addresses(cidr, { offset: 1, count: 3 }));
 * assertEquals(usable.map(stringifyIpv4), ["10.0.0.1", "10.0.0.2", "10.0.0.3"]);
 * ```
 *
 * ## API Reference
 *
 * ### Universal (auto-detect IPv4/IPv6)
 * - {@link parseIp}: Parse any IP address string to number (IPv4) or bigint (IPv6)
 * - {@link stringifyIp}: Convert number or bigint to IP address string
 * - {@link parseCidr}: Parse any CIDR notation string to Cidrv4 or Cidrv6
 * - {@link stringifyCidr}: Convert Cidrv4 or Cidrv6 to CIDR notation string
 * - {@link cidrContainsCidr}: Check if one CIDR fully contains another (auto-detect version)
 * - {@link cidrOverlaps}: Check if two CIDRs share at least one address (auto-detect version)
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
 * - {@link cidrv4ContainsCidr}: Check if one IPv4 CIDR fully contains another
 * - {@link cidrv4Overlaps}: Check if two IPv4 CIDRs share at least one address
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
 * - {@link cidrv6ContainsCidr}: Check if one IPv6 CIDR fully contains another
 * - {@link cidrv6Overlaps}: Check if two IPv6 CIDRs share at least one address
 * - {@link cidrv6FirstAddress}: Get first address in CIDR range
 * - {@link cidrv6LastAddress}: Get last address in CIDR range
 * - {@link cidrv6Size}: Get total number of addresses in CIDR range
 * - {@link cidrv6Addresses}: Generate IP addresses in CIDR range
 * - {@link isValidCidrv6}: Check if a string is valid IPv6 CIDR notation
 *
 * ### Validation
 * - {@link isValidIp}: Check if a string is a valid plain IP address (IPv4 or IPv6)
 * - {@link isValidCidr}: Check if a string is valid CIDR notation (IPv4 or IPv6)
 *
 * ### IPv4 Classification
 * - {@link ClassificationIpv4}: Type for all IPv4 classification labels
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
 * - {@link ClassificationIpv6}: Type for all IPv6 classification labels
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
 * ### IPv4-Mapped IPv6 Conversion (4to6)
 * - {@link ipv4To64Mapped}: Convert IPv4 number to IPv4-mapped IPv6 bigint
 * - {@link ipv4From64Mapped}: Extract IPv4 number from IPv4-mapped IPv6 bigint
 * - {@link cidrv4ToCidrv64Mapped}: Convert IPv4 CIDR to IPv4-mapped IPv6 CIDR
 * - {@link cidrv4FromCidrv64Mapped}: Convert IPv4-mapped IPv6 CIDR to IPv4 CIDR
 *
 * ### Combined Classification
 * - {@link ClassifiedIp}: Discriminated union result with kind, value, and classification
 * - {@link ClassifiedIpv4}: Result type for IPv4 classification
 * - {@link ClassifiedIpv6}: Result type for IPv6 classification
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
 * - [`validate`](https://jsr.io/@hertzg/ip/doc/validate): Universal validation via {@link isValidIp}, {@link isValidCidr}
 * - [`4to6`](https://jsr.io/@hertzg/ip/doc/4to6): IPv4-mapped IPv6 conversion via {@link ipv4To64Mapped}, {@link ipv4From64Mapped}, {@link cidrv4ToCidrv64Mapped}, {@link cidrv4FromCidrv64Mapped}
 *
 * @module
 */

// --- Universal (auto-detect IPv4/IPv6) ---

export { parseIp, stringifyIp } from "./ip.ts";
export { cidrContainsCidr, cidrOverlaps, parseCidr, stringifyCidr } from "./cidr.ts";
export {
  type ClassificationIpv4,
  type ClassificationIpv6,
  type ClassifiedIp,
  type ClassifiedIpv4,
  type ClassifiedIpv6,
  classifyIp,
} from "./classify.ts";
export { isValidCidr, isValidIp } from "./validate.ts";

// --- IPv4 ---

export { parseIpv4, stringifyIpv4 } from "./ipv4.ts";
export { isValidCidrv4, isValidIpv4 } from "./validatev4.ts";

export {
  type Cidrv4,
  cidrv4Addresses,
  cidrv4BroadcastAddress,
  cidrv4Contains,
  cidrv4ContainsCidr,
  cidrv4FirstAddress,
  cidrv4LastAddress,
  cidrv4Mask,
  cidrv4NetworkAddress,
  cidrv4Overlaps,
  cidrv4Size,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";

export {
  classifyIpv4,
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

export { compressIpv6, expandIpv6, parseIpv6, stringifyIpv6 } from "./ipv6.ts";
export { isValidCidrv6, isValidIpv6 } from "./validatev6.ts";

export {
  type Cidrv6,
  cidrv6Addresses,
  cidrv6Contains,
  cidrv6ContainsCidr,
  cidrv6FirstAddress,
  cidrv6LastAddress,
  cidrv6Mask,
  cidrv6Overlaps,
  cidrv6Size,
  parseCidrv6,
  stringifyCidrv6,
} from "./cidrv6.ts";

export {
  classifyIpv6,
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
  isIpv6UniqueLocal,
  isIpv6Unspecified,
} from "./classifyv6.ts";

// --- IPv4-mapped IPv6 conversion ---

export {
  cidrv4FromCidrv64Mapped,
  cidrv4ToCidrv64Mapped,
  ipv4From64Mapped,
  ipv4To64Mapped,
} from "./4to6.ts";
