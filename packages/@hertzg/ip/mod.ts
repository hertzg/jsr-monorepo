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
 * - **Sorting**: Version-first comparators for addresses and CIDR blocks, mixed lists included
 * - **IPv4 & IPv6 Parsing**: Convert between standard notation and number/bigint for arithmetic
 * - **Address Generation**: Lazily enumerate addresses in CIDR blocks
 * - **IPv4-Mapped Conversion**: Convert between IPv4 and IPv4-mapped IPv6 addresses and CIDRs
 * - **Validation**: Non-throwing validity checks for IP addresses and CIDR notation
 * - **Wire Bytes**: Read and write addresses directly in packet buffers, no string round-trip
 * - **Reverse DNS**: Build the `in-addr.arpa` / `ip6.arpa` pointer name of an address
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
 * @example Check if a client IP is in a set of trusted CIDR blocks
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrContains, parseCidr, parseIp } from "@hertzg/ip";
 *
 * // The list may mix IP versions; each entry is only ever compared against an
 * // address of its own version, and a mismatch is a miss rather than an error
 * const trustedRanges = [
 *   "10.0.0.0/8",
 *   "172.16.0.0/12",
 *   "192.168.0.0/16",
 *   "fd00::/8",
 * ].map(parseCidr);
 *
 * function isTrusted(ip: string): boolean {
 *   const address = parseIp(ip);
 *   return trustedRanges.some((cidr) => cidrContains(cidr, address));
 * }
 *
 * assert(isTrusted("192.168.1.100"));
 * assert(isTrusted("10.0.0.1"));
 * assert(isTrusted("::ffff:172.16.5.1")); // parseIp unwrapped this to IPv4 first
 * assert(isTrusted("fd00::1")); // matched the IPv6 entry, no conversion involved
 *
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
 * ## Sorting
 *
 * @example Sort a mixed dual-stack list of addresses and CIDR blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidr, compareIp, parseCidr, parseIp, stringify } from "@hertzg/ip";
 *
 * // All IPv4 sorts before all IPv6, numerically ascending within each version
 * const clients = ["2001:db8::1", "10.0.0.10", "::1", "10.0.0.2"].map(parseIp);
 * assertEquals(clients.toSorted(compareIp).map(stringify), [
 *   "10.0.0.2",
 *   "10.0.0.10",
 *   "::1",
 *   "2001:db8::1",
 * ]);
 *
 * // CIDR blocks tie-break on prefix length: the larger block comes first
 * const ranges = ["10.0.0.0/16", "2001:db8::/32", "10.0.0.0/8"].map(parseCidr);
 * assertEquals(ranges.toSorted(compareCidr).map(stringify), [
 *   "10.0.0.0/8",
 *   "10.0.0.0/16",
 *   "2001:db8::/32",
 * ]);
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
 * ## Containment Checking
 *
 * @example Check if IPs fall within a CIDR block
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
 * ## Address Enumeration
 *
 * @example Generate addresses in a CIDR block
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
 * ## Wire Bytes
 *
 * @example Decode addresses straight out of a packet buffer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4FromBytes, ipv4ToBytes, stringifyIpv4 } from "@hertzg/ip";
 *
 * // deno-fmt-ignore
 * const packet = new Uint8Array([
 *   0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
 *   0x40, 0x06, 0x00, 0x00,
 *   10, 0, 0, 1,
 *   192, 168, 1, 1,
 * ]);
 *
 * // Read the source and destination fields in place
 * assertEquals(stringifyIpv4(ipv4FromBytes(packet, 12)), "10.0.0.1");
 * assertEquals(stringifyIpv4(ipv4FromBytes(packet, 16)), "192.168.1.1");
 *
 * // Rewrite the destination in place; the return is only the bytes written
 * const written = ipv4ToBytes(ipv4FromBytes(packet, 12), packet, 16);
 * assertEquals(written, new Uint8Array([10, 0, 0, 1]));
 * assertEquals(stringifyIpv4(ipv4FromBytes(packet, 16)), "10.0.0.1");
 * ```
 *
 * ## Reverse DNS
 *
 * The names are relative -- no trailing dot. Append `"."` if a resolver
 * requires an absolute name.
 *
 * @example Build the name a PTR record lives at
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipToArpa, parseIp } from "@hertzg/ip";
 *
 * assertEquals(ipToArpa(parseIp("192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * assertEquals(
 *   ipToArpa(parseIp("2001:db8::1")),
 *   "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * ## API Reference
 *
 * ### Universal (auto-detect IPv4/IPv6)
 * - {@link Address}: An IP address of either version (`number` or `bigint`)
 * - {@link AddressOrCidr}: An IP address or a CIDR block, either version
 * - {@link parse}: Parse any IP address or CIDR string to its typed representation
 * - {@link stringify}: Convert any IP address or CIDR value to its string notation
 * - {@link parseIp}: Parse any IP address string to number (IPv4) or bigint (IPv6)
 * - {@link stringifyIp}: Convert number or bigint to IP address string
 * - {@link parseCidr}: Parse any CIDR notation string to Cidrv4 or Cidrv6
 * - {@link stringifyCidr}: Convert Cidrv4 or Cidrv6 to CIDR notation string
 * - {@link cidrSize}: Get total number of addresses in a CIDR block
 * - {@link cidrFirstAddress}: Get the first address of a CIDR block
 * - {@link cidrLastAddress}: Get the last address of a CIDR block
 * - {@link cidrAddresses}: Generate IP addresses in a CIDR block
 * - {@link cidrContains}: Check if a CIDR block contains an address
 * - {@link cidrContainsCidr}: Check if one CIDR fully contains another
 * - {@link cidrOverlaps}: Check if two CIDRs share at least one address
 * - {@link cidrIntersect}: Return the overlapping CIDR block, or null
 * - {@link cidrSubtract}: Return CIDR blocks in A but not in B
 * - {@link cidrMerge}: Merge CIDR blocks into the minimal covering set
 * - {@link compareIp}: Compare two IP addresses of either version for sorting
 * - {@link compareCidr}: Compare two CIDR blocks of either version for sorting
 * - {@link isValidIp}: Check if a string is a valid plain IP address (IPv4 or IPv6)
 * - {@link isValidCidr}: Check if a string is valid CIDR notation (IPv4 or IPv6)
 * - {@link ipVersion}: Report which IP version an address string is written in, or undefined
 * - {@link cidrVersion}: Report which IP version a CIDR string is written in, or undefined
 * - {@link IpVersion}: An IP version number, 4 or 6
 * - {@link classifyIp}: Classify an IPv4 (number) or IPv6 (bigint) address
 * - {@link ClassifiedIp}: Discriminated union result with kind, value, and classification
 * - {@link ClassifiedIpv4}: Result type for IPv4 classification
 * - {@link ClassifiedIpv6}: Result type for IPv6 classification
 *
 * ### IPv4
 * - {@link parseIpv4}: Parse dotted decimal notation to number
 * - {@link stringifyIpv4}: Convert number to dotted decimal notation
 * - {@link ipv4ToArpa}: Build the `in-addr.arpa` reverse DNS pointer name
 * - {@link compareIpv4}: Compare two IPv4 addresses for sorting
 * - {@link isValidIpv4}: Check if a string is a valid IPv4 address
 *
 * ### IPv4 CIDR
 * - {@link Cidrv4}: Type representing an IPv4 CIDR block
 * - {@link parseCidrv4}: Parse CIDR notation string to Cidrv4
 * - {@link stringifyCidrv4}: Convert Cidrv4 to CIDR notation string
 * - {@link cidrv4Mask}: Create network mask from prefix length (0-32)
 * - {@link cidrv4MaskToPrefixLength}: Recover prefix length from a network mask, as a number or notation string
 * - {@link cidrv4Contains}: Check if IP is within CIDR block
 * - {@link cidrv4ContainsCidr}: Check if one IPv4 CIDR fully contains another
 * - {@link cidrv4Overlaps}: Check if two IPv4 CIDRs share at least one address
 * - {@link cidrv4Intersect}: Return the overlapping IPv4 CIDR block, or null
 * - {@link cidrv4Subtract}: Return IPv4 CIDR blocks in A but not in B
 * - {@link cidrv4Merge}: Merge IPv4 CIDR blocks into the minimal covering set
 * - {@link cidrv4FirstAddress}: Get first address in CIDR block
 * - {@link cidrv4LastAddress}: Get last address in CIDR block
 * - {@link cidrv4NetworkAddress}: Get the network address (first address) of a CIDR block
 * - {@link cidrv4BroadcastAddress}: Get the directed broadcast address (last address) of a CIDR block
 * - {@link cidrv4FirstUsableAddress}: Get first assignable address in CIDR block (RFC 3021 aware)
 * - {@link cidrv4LastUsableAddress}: Get last assignable address in CIDR block (RFC 3021 aware)
 * - {@link cidrv4Size}: Get total number of addresses in CIDR block
 * - {@link cidrv4UsableSize}: Get number of assignable addresses in CIDR block
 * - {@link cidrv4Addresses}: Generate IP addresses in CIDR block
 * - {@link cidrv4UsableAddresses}: Generate every assignable address in CIDR block
 * - {@link compareCidrv4}: Compare two IPv4 CIDR blocks for sorting
 * - {@link isValidCidrv4}: Check if a string is valid IPv4 CIDR notation
 *
 * ### IPv6
 * - {@link parseIpv6}: Parse colon-hexadecimal notation to bigint
 * - {@link stringifyIpv6}: Convert bigint to compressed colon-hexadecimal
 * - {@link stringifyIpv6Expanded}: Convert bigint to full uncompressed colon-hexadecimal
 * - {@link expandIpv6}: Expand to full uncompressed form
 * - {@link compressIpv6}: Compress to canonical shortest form
 * - {@link ipv6ToArpa}: Build the `ip6.arpa` reverse DNS pointer name
 * - {@link compareIpv6}: Compare two IPv6 addresses for sorting
 * - {@link isValidIpv6}: Check if a string is a valid IPv6 address
 *
 * ### IPv6 CIDR
 * - {@link Cidrv6}: Type representing an IPv6 CIDR block
 * - {@link parseCidrv6}: Parse CIDR notation string to Cidrv6
 * - {@link stringifyCidrv6}: Convert Cidrv6 to CIDR notation string
 * - {@link cidrv6Mask}: Create network mask from prefix length (0-128)
 * - {@link cidrv6MaskToPrefixLength}: Recover prefix length from a network mask, as a bigint or notation string
 * - {@link cidrv6Contains}: Check if IP is within CIDR block
 * - {@link cidrv6ContainsCidr}: Check if one IPv6 CIDR fully contains another
 * - {@link cidrv6Overlaps}: Check if two IPv6 CIDRs share at least one address
 * - {@link cidrv6Intersect}: Return the overlapping IPv6 CIDR block, or null
 * - {@link cidrv6Subtract}: Return IPv6 CIDR blocks in A but not in B
 * - {@link cidrv6Merge}: Merge IPv6 CIDR blocks into the minimal covering set
 * - {@link cidrv6FirstAddress}: Get first address in CIDR block
 * - {@link cidrv6LastAddress}: Get last address in CIDR block
 * - {@link cidrv6Size}: Get total number of addresses in CIDR block
 * - {@link cidrv6Addresses}: Generate IP addresses in CIDR block
 * - {@link compareCidrv6}: Compare two IPv6 CIDR blocks for sorting
 * - {@link isValidCidrv6}: Check if a string is valid IPv6 CIDR notation
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
 * ### Universal Wire Byte Conversion (bytes)
 * - {@link ipFromBytes}: Read a 4- or 16-byte address, version from its length
 * - {@link ipToBytes}: Write an address as its wire bytes, width from its type
 *
 * ### IPv4 Wire Byte Conversion (bytesv4)
 * - {@link ipv4FromBytes}: Read a 4-byte IPv4 address from a buffer
 * - {@link ipv4ToBytes}: Write a 4-byte IPv4 address to a buffer
 *
 * ### IPv6 Wire Byte Conversion (bytesv6)
 * - {@link ipv6FromBytes}: Read a 16-byte IPv6 address from a buffer
 * - {@link ipv6ToBytes}: Write a 16-byte IPv6 address to a buffer
 *
 * ### Reverse DNS Pointer Names (arpa)
 * - {@link ipToArpa}: Build the pointer name of an address of either version
 *
 * ### Submodules
 * - [`ip`](https://jsr.io/@hertzg/ip/doc/ip): Universal IP parsing via {@link parseIp}, {@link stringifyIp}, {@link compareIp}
 * - [`cidr`](https://jsr.io/@hertzg/ip/doc/cidr): Universal CIDR parsing via {@link parseCidr}, {@link stringifyCidr}, {@link compareCidr}
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/ipv4): IPv4 parsing, sorting, and validation
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): IPv4 CIDR utilities, sorting, and validation
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/ipv6): IPv6 parsing, sorting, and validation
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): IPv6 CIDR utilities, sorting, and validation
 * - [`classify`](https://jsr.io/@hertzg/ip/doc/classify): Universal classifier via {@link classifyIp}
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): IPv4 classification via {@link classifyIpv4}, {@link isIpv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): IPv6 classification via {@link classifyIpv6}, {@link isIpv6Loopback}, etc.
 * - [`validate`](https://jsr.io/@hertzg/ip/doc/validate): Universal validation via {@link isValidIp}, {@link isValidCidr}
 * - [`version`](https://jsr.io/@hertzg/ip/doc/version): IP version detection via {@link ipVersion}, {@link cidrVersion}
 * - [`4to6`](https://jsr.io/@hertzg/ip/doc/4to6): IPv4-mapped IPv6 conversion via {@link ipv4To64Mapped}, {@link ipv4From64Mapped}, {@link cidrv4ToCidrv64Mapped}, {@link cidrv4FromCidrv64Mapped}
 * - [`bytes`](https://jsr.io/@hertzg/ip/doc/bytes): Universal wire byte conversion via {@link ipFromBytes}, {@link ipToBytes}
 * - [`bytesv4`](https://jsr.io/@hertzg/ip/doc/bytesv4): IPv4 wire byte conversion via {@link ipv4FromBytes}, {@link ipv4ToBytes}
 * - [`bytesv6`](https://jsr.io/@hertzg/ip/doc/bytesv6): IPv6 wire byte conversion via {@link ipv6FromBytes}, {@link ipv6ToBytes}
 * - [`arpa`](https://jsr.io/@hertzg/ip/doc/arpa): Universal reverse DNS pointer names via {@link ipToArpa}
 *
 * @module
 */

// --- Universal (auto-detect IPv4/IPv6) ---

import { parseCidr, stringifyCidr } from "./cidr.ts";
import { parseIp, stringifyIp } from "./ip.ts";
import type { AddressOrCidr } from "./cidr.ts";
import type { Cidrv4 } from "./cidr.ts";
import type { Cidrv6 } from "./cidr.ts";

export {
  /** A plain IP address of either IP version. */
  type Address,
  /** Compare two IP addresses of either version for sorting. */
  compareIp,
  /** Parse any IP address string to number (IPv4) or bigint (IPv6). */
  parseIp,
  /** Convert number or bigint to IP address string. */
  stringifyIp,
} from "./ip.ts";
export {
  /** An IP address or a CIDR block, of either IP version. */
  type AddressOrCidr,
  /** A CIDR block of either IP version. */
  type Cidr,
  /** Generate IP addresses in a CIDR block. */
  cidrAddresses,
  /** Check if a CIDR block contains an address. */
  cidrContains,
  /** Check if one CIDR fully contains another. */
  cidrContainsCidr,
  /** Get the first address of a CIDR block. */
  cidrFirstAddress,
  /** Return the overlapping CIDR block, or null. */
  cidrIntersect,
  /** Get the last address of a CIDR block. */
  cidrLastAddress,
  /** Merge CIDR blocks into the minimal covering set. */
  cidrMerge,
  /** Check if two CIDRs share at least one address. */
  cidrOverlaps,
  /** Get total number of addresses in a CIDR block. */
  cidrSize,
  /** Return CIDR blocks in A but not in B. */
  cidrSubtract,
  /** Compare two CIDR blocks of either version for sorting. */
  compareCidr,
  /** Type guard that checks whether a Cidr is an IPv4 CIDR block. */
  isCidrv4,
  /** Type guard that checks whether a Cidr is an IPv6 CIDR block. */
  isCidrv6,
  /** Parse any CIDR notation string to Cidrv4 or Cidrv6. */
  parseCidr,
  /** Convert Cidrv4 or Cidrv6 to CIDR notation string. */
  stringifyCidr,
} from "./cidr.ts";

/**
 * Parses an IP address or CIDR notation string.
 *
 * Detects CIDR notation by checking for `/`. If present, delegates to
 * {@link parseCidr}; otherwise delegates to {@link parseIp}. The IP version
 * (IPv4 vs IPv6) is auto-detected within each delegate.
 *
 * @param notation The address or CIDR notation string
 * @returns The parsed {@link AddressOrCidr} — `number` (IPv4),
 *   `bigint` (IPv6), {@link Cidrv4} (IPv4 CIDR), or {@link Cidrv6}
 *   (IPv6 CIDR)
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If values are out of range
 *
 * @example Parse IP addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@hertzg/ip";
 *
 * assertEquals(parse("10.0.0.1"), 167772161);
 * assertEquals(parse("::1"), 1n);
 * assertEquals(parse("::ffff:192.168.1.1"), 3232235777);
 * ```
 *
 * @example Parse CIDR blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@hertzg/ip";
 *
 * const v4 = parse("10.0.0.0/8");
 * assertEquals(v4, { address: 167772160, prefixLength: 8 });
 *
 * const v6 = parse("fe80::/10");
 * assertEquals(v6, { address: 0xfe80_0000_0000_0000_0000_0000_0000_0000n, prefixLength: 10 });
 *
 * const mapped = parse("::ffff:192.168.1.0/120");
 * assertEquals(mapped, { address: 3232235776, prefixLength: 24 });
 * ```
 */
export function parse(notation: string): AddressOrCidr {
  if (notation.includes("/")) {
    return parseCidr(notation);
  }
  return parseIp(notation);
}

/** Stringifies an IPv4 address (`number`) to dotted decimal notation. */
export function stringify(value: number): string;
/** Stringifies an IPv6 address (`bigint`) to compressed colon-hexadecimal notation. */
export function stringify(value: bigint): string;
/** Stringifies a {@link Cidrv4} to IPv4 CIDR notation. */
export function stringify(value: Cidrv4): string;
/** Stringifies a {@link Cidrv6} to IPv6 CIDR notation. */
export function stringify(value: Cidrv6): string;
/**
 * Stringifies an IP address or CIDR block to its standard notation.
 *
 * Dispatches based on the value type:
 * - `number` → {@link stringifyIp} (IPv4 dotted decimal)
 * - `bigint` → {@link stringifyIp} (IPv6 compressed colon-hexadecimal)
 * - object with `address` and `prefixLength` → {@link stringifyCidr}
 *
 * @param value The IP address or CIDR block to stringify
 * @returns The string representation
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse, stringify } from "@hertzg/ip";
 *
 * assertEquals(stringify(167772161), "10.0.0.1");
 * assertEquals(stringify(1n), "::1");
 * assertEquals(stringify(parse("10.0.0.0/8")), "10.0.0.0/8");
 * assertEquals(stringify(parse("2001:db8::/32")), "2001:db8::/32");
 * ```
 */
export function stringify(value: AddressOrCidr): string;
/** Stringifies an IP address or CIDR block to its standard notation. */
export function stringify(value: AddressOrCidr): string {
  if (typeof value === "number" || typeof value === "bigint") {
    return stringifyIp(value);
  }
  return stringifyCidr(value);
}
export {
  /** Type for all IPv4 classification labels. */
  type ClassificationIpv4,
  /** Type for all IPv6 classification labels. */
  type ClassificationIpv6,
  /** Discriminated union result with kind, value, and classification. */
  type ClassifiedIp,
  /** Result type for IPv4 classification. */
  type ClassifiedIpv4,
  /** Result type for IPv6 classification. */
  type ClassifiedIpv6,
  /** Classify an IPv4 (number) or IPv6 (bigint) address. */
  classifyIp,
} from "./classify.ts";
export {
  /** Check if a string is valid CIDR notation (IPv4 or IPv6). */
  isValidCidr,
  /** Check if a string is a valid plain IP address (IPv4 or IPv6). */
  isValidIp,
} from "./validate.ts";
export {
  /** Report which IP version a CIDR string is written in, or undefined. */
  cidrVersion,
  /** An IP version number: 4 for IPv4, 6 for IPv6. */
  type IpVersion,
  /** Report which IP version an address string is written in, or undefined. */
  ipVersion,
} from "./version.ts";

// --- IPv4 ---

export {
  /** Compare two IPv4 addresses for sorting. */
  compareIpv4,
  /** Build the `in-addr.arpa` reverse DNS pointer name of an IPv4 address. */
  ipv4ToArpa,
  /** Parse dotted decimal notation to number. */
  parseIpv4,
  /** Convert number to dotted decimal notation. */
  stringifyIpv4,
} from "./ipv4.ts";
export {
  /** Check if a string is valid IPv4 CIDR notation. */
  isValidCidrv4,
  /** Check if a string is a valid IPv4 address. */
  isValidIpv4,
} from "./validatev4.ts";

export {
  /** Type representing an IPv4 CIDR block. */
  type Cidrv4,
  /** Generate IP addresses in CIDR block. */
  cidrv4Addresses,
  /** Get the directed broadcast address (last address) of a CIDR block. */
  cidrv4BroadcastAddress,
  /** Check if IP is within CIDR block. */
  cidrv4Contains,
  /** Check if one IPv4 CIDR fully contains another. */
  cidrv4ContainsCidr,
  /** Get first address in CIDR block. */
  cidrv4FirstAddress,
  /** Get first assignable address in CIDR block (RFC 3021 aware). */
  cidrv4FirstUsableAddress,
  /** Return the overlapping IPv4 CIDR block, or null. */
  cidrv4Intersect,
  /** Get last address in CIDR block. */
  cidrv4LastAddress,
  /** Get last assignable address in CIDR block (RFC 3021 aware). */
  cidrv4LastUsableAddress,
  /** Create network mask from prefix length (0-32). */
  cidrv4Mask,
  /** Recover prefix length from a network mask, as a number or notation string. */
  cidrv4MaskToPrefixLength,
  /** Merge IPv4 CIDR blocks into the minimal covering set. */
  cidrv4Merge,
  /** Get the network address (first address) of a CIDR block. */
  cidrv4NetworkAddress,
  /** Check if two IPv4 CIDRs share at least one address. */
  cidrv4Overlaps,
  /** Get total number of addresses in CIDR block. */
  cidrv4Size,
  /** Return IPv4 CIDR blocks in A but not in B. */
  cidrv4Subtract,
  /** Generate every assignable address in CIDR block. */
  cidrv4UsableAddresses,
  /** Get number of assignable addresses in CIDR block. */
  cidrv4UsableSize,
  /** Compare two IPv4 CIDR blocks for sorting. */
  compareCidrv4,
  /** Parse CIDR notation string to Cidrv4. */
  parseCidrv4,
  /** Convert Cidrv4 to CIDR notation string. */
  stringifyCidrv4,
} from "./cidrv4.ts";

export {
  /** Classify an IPv4 address into its well-known range. */
  classifyIpv4,
  /** Check if address is benchmarking (198.18.0.0/15). */
  isIpv4Benchmarking,
  /** Check if address is broadcast (255.255.255.255). */
  isIpv4Broadcast,
  /** Check if address is Carrier-Grade NAT (100.64.0.0/10). */
  isIpv4CgNat,
  /** Check if address is documentation (RFC 5737). */
  isIpv4Documentation,
  /** Check if address is link-local (169.254.0.0/16). */
  isIpv4LinkLocal,
  /** Check if address is loopback (127.0.0.0/8). */
  isIpv4Loopback,
  /** Check if address is multicast (224.0.0.0/4). */
  isIpv4Multicast,
  /** Check if address is private (RFC 1918). */
  isIpv4Private,
  /** Check if address is publicly routable. */
  isIpv4Public,
  /** Check if address is reserved (240.0.0.0/4). */
  isIpv4Reserved,
  /** Check if address is "this network" (0.0.0.0/8). */
  isIpv4ThisNetwork,
} from "./classifyv4.ts";

// --- IPv6 ---

export {
  /** Compare two IPv6 addresses for sorting. */
  compareIpv6,
  /** Compress to canonical shortest form. */
  compressIpv6,
  /** Expand to full uncompressed form. */
  expandIpv6,
  /** Build the `ip6.arpa` reverse DNS pointer name of an IPv6 address. */
  ipv6ToArpa,
  /** Parse colon-hexadecimal notation to bigint. */
  parseIpv6,
  /** Convert bigint to compressed colon-hexadecimal. */
  stringifyIpv6,
  /** Convert bigint to full uncompressed colon-hexadecimal. */
  stringifyIpv6Expanded,
} from "./ipv6.ts";
export {
  /** Check if a string is valid IPv6 CIDR notation. */
  isValidCidrv6,
  /** Check if a string is a valid IPv6 address. */
  isValidIpv6,
} from "./validatev6.ts";

export {
  /** Type representing an IPv6 CIDR block. */
  type Cidrv6,
  /** Generate IP addresses in CIDR block. */
  cidrv6Addresses,
  /** Check if IP is within CIDR block. */
  cidrv6Contains,
  /** Check if one IPv6 CIDR fully contains another. */
  cidrv6ContainsCidr,
  /** Get first address in CIDR block. */
  cidrv6FirstAddress,
  /** Return the overlapping IPv6 CIDR block, or null. */
  cidrv6Intersect,
  /** Get last address in CIDR block. */
  cidrv6LastAddress,
  /** Create network mask from prefix length (0-128). */
  cidrv6Mask,
  /** Recover prefix length from a network mask, as a bigint or notation string. */
  cidrv6MaskToPrefixLength,
  /** Merge IPv6 CIDR blocks into the minimal covering set. */
  cidrv6Merge,
  /** Check if two IPv6 CIDRs share at least one address. */
  cidrv6Overlaps,
  /** Get total number of addresses in CIDR block. */
  cidrv6Size,
  /** Return IPv6 CIDR blocks in A but not in B. */
  cidrv6Subtract,
  /** Compare two IPv6 CIDR blocks for sorting. */
  compareCidrv6,
  /** Parse CIDR notation string to Cidrv6. */
  parseCidrv6,
  /** Convert Cidrv6 to CIDR notation string. */
  stringifyCidrv6,
} from "./cidrv6.ts";

export {
  /** Classify an IPv6 address into its well-known range. */
  classifyIpv6,
  /** Check if address is benchmarking (2001:2::/48). */
  isIpv6Benchmarking,
  /** Check if address is documentation (2001:db8::/32). */
  isIpv6Documentation,
  /** Check if address is global unicast (2000::/3). */
  isIpv6GlobalUnicast,
  /** Check if address is IPv4-mapped (::ffff:0:0/96). */
  isIpv6Ipv4Mapped,
  /** Check if address is IPv4-translated (64:ff9b::/96). */
  isIpv6Ipv4Translated,
  /** Check if address is link-local (fe80::/10). */
  isIpv6LinkLocal,
  /** Check if address is loopback (::1). */
  isIpv6Loopback,
  /** Check if address is multicast (ff00::/8). */
  isIpv6Multicast,
  /** Check if address is ORCHIDv2 (2001:20::/28). */
  isIpv6Orchidv2,
  /** Check if address is Teredo (2001::/32). */
  isIpv6Teredo,
  /** Check if address is unique local (fc00::/7). */
  isIpv6UniqueLocal,
  /** Check if address is unspecified (::). */
  isIpv6Unspecified,
} from "./classifyv6.ts";

// --- IPv4-mapped IPv6 conversion ---

export {
  /** Convert IPv4-mapped IPv6 CIDR to IPv4 CIDR. */
  cidrv4FromCidrv64Mapped,
  /** Convert IPv4 CIDR to IPv4-mapped IPv6 CIDR. */
  cidrv4ToCidrv64Mapped,
  /** Extract IPv4 number from IPv4-mapped IPv6 bigint. */
  ipv4From64Mapped,
  /** Convert IPv4 number to IPv4-mapped IPv6 bigint. */
  ipv4To64Mapped,
} from "./4to6.ts";

// --- Wire byte conversion ---

export {
  /** Read a 4- or 16-byte address, picking the version from its length. */
  ipFromBytes,
  /** Write an address as its wire bytes, 4 for IPv4 and 16 for IPv6. */
  ipToBytes,
} from "./bytes.ts";
export {
  /** Read a 4-byte IPv4 address from a buffer. */
  ipv4FromBytes,
  /** Write a 4-byte IPv4 address to a buffer. */
  ipv4ToBytes,
} from "./bytesv4.ts";
export {
  /** Read a 16-byte IPv6 address from a buffer. */
  ipv6FromBytes,
  /** Write a 16-byte IPv6 address to a buffer. */
  ipv6ToBytes,
} from "./bytesv6.ts";

// --- Reverse DNS pointer names ---

export {
  /** Build the reverse DNS pointer name of an address of either version. */
  ipToArpa,
} from "./arpa.ts";
