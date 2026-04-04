/**
 * IPv6 address classification utilities.
 *
 * This module provides functions to classify IPv6 addresses into well-known
 * ranges defined by IANA and various RFCs. Each function checks if an IPv6
 * address (as a 128-bit bigint) belongs to a specific range.
 *
 * @example Classify an IPv6 address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIpv6 } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(classifyIpv6(parseIpv6("::1")), "loopback");
 * assertEquals(classifyIpv6(parseIpv6("2001:db8::1")), "documentation");
 * assertEquals(classifyIpv6(parseIpv6("fe80::1")), "link-local");
 * assertEquals(classifyIpv6(parseIpv6("2607:f8b0:4004:800::200e")), "global-unicast");
 * ```
 *
 * @example Check specific ranges
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Loopback, isIpv6UniqueLocal } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Loopback(parseIpv6("::1")));
 * assert(isIpv6UniqueLocal(parseIpv6("fd00::1")));
 * assertEquals(isIpv6Loopback(parseIpv6("::2")), false);
 * ```
 *
 * @module
 */

import { type Cidrv6, cidrv6Contains, parseCidrv6 } from "./cidrv6.ts";

// Precomputed CIDR blocks for range checks.
const CIDR_LOOPBACK: Cidrv6 = parseCidrv6("::1/128");
const CIDR_UNSPECIFIED: Cidrv6 = parseCidrv6("::/128");
const CIDR_UNIQUE_LOCAL: Cidrv6 = parseCidrv6("fc00::/7");
const CIDR_LINK_LOCAL: Cidrv6 = parseCidrv6("fe80::/10");
const CIDR_MULTICAST: Cidrv6 = parseCidrv6("ff00::/8");
const CIDR_GLOBAL_UNICAST: Cidrv6 = parseCidrv6("2000::/3");
const CIDR_TEREDO: Cidrv6 = parseCidrv6("2001::/32");
const CIDR_BENCHMARKING: Cidrv6 = parseCidrv6("2001:2::/48");
const CIDR_ORCHIDV2: Cidrv6 = parseCidrv6("2001:20::/28");
const CIDR_DOCUMENTATION: Cidrv6 = parseCidrv6("2001:db8::/32");
const CIDR_IPV4_MAPPED: Cidrv6 = parseCidrv6("::ffff:0:0/96");
const CIDR_IPV4_TRANSLATED: Cidrv6 = parseCidrv6("64:ff9b::/96");

/**
 * All possible IPv6 address classification labels.
 *
 * Returned by {@link classifyIpv6} to identify which well-known range
 * an IPv6 address belongs to.
 */
export type ClassificationIpv6 =
  | "loopback"
  | "unspecified"
  | "ipv4-mapped"
  | "ipv4-translated"
  | "documentation"
  | "benchmarking"
  | "orchidv2"
  | "teredo"
  | "link-local"
  | "multicast"
  | "unique-local"
  | "global-unicast"
  | "unassigned";

/**
 * Checks if an IPv6 address is the loopback address (RFC 4291).
 *
 * Loopback: `::1`
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is the loopback address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Loopback } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Loopback(parseIpv6("::1")));
 * assertEquals(isIpv6Loopback(parseIpv6("::")), false);
 * assertEquals(isIpv6Loopback(parseIpv6("::2")), false);
 * ```
 */
export function isIpv6Loopback(ip: bigint): boolean {
  return cidrv6Contains(CIDR_LOOPBACK, ip);
}

/**
 * Checks if an IPv6 address is the unspecified address (RFC 4291).
 *
 * Unspecified: `::`
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is the unspecified address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Unspecified } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Unspecified(parseIpv6("::")));
 * assertEquals(isIpv6Unspecified(parseIpv6("::1")), false);
 * ```
 */
export function isIpv6Unspecified(ip: bigint): boolean {
  return cidrv6Contains(CIDR_UNSPECIFIED, ip);
}

/**
 * Checks if an IPv6 address is a link-local address (RFC 4291).
 *
 * Link-local range: `fe80::/10` (fe80:: – febf:ffff:...:ffff)
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is link-local
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6LinkLocal } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6LinkLocal(parseIpv6("fe80::1")));
 * assert(isIpv6LinkLocal(parseIpv6("fe80::")));
 * assertEquals(isIpv6LinkLocal(parseIpv6("fec0::1")), false);
 * ```
 */
export function isIpv6LinkLocal(ip: bigint): boolean {
  return cidrv6Contains(CIDR_LINK_LOCAL, ip);
}

/**
 * Checks if an IPv6 address is a multicast address (RFC 4291).
 *
 * Multicast range: `ff00::/8` (ff00:: – ffff:ffff:...:ffff)
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is multicast
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Multicast } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Multicast(parseIpv6("ff02::1")));
 * assert(isIpv6Multicast(parseIpv6("ff00::")));
 * assertEquals(isIpv6Multicast(parseIpv6("fe80::1")), false);
 * ```
 */
export function isIpv6Multicast(ip: bigint): boolean {
  return cidrv6Contains(CIDR_MULTICAST, ip);
}

/**
 * Checks if an IPv6 address is a unique local address (RFC 4193).
 *
 * Unique local range: `fc00::/7` (fc00:: – fdff:ffff:...:ffff)
 *
 * This is the IPv6 equivalent of IPv4 private addresses (RFC 1918).
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is unique local
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6UniqueLocal } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6UniqueLocal(parseIpv6("fc00::1")));
 * assert(isIpv6UniqueLocal(parseIpv6("fd00::1")));
 * assertEquals(isIpv6UniqueLocal(parseIpv6("fe00::1")), false);
 * ```
 */
export function isIpv6UniqueLocal(ip: bigint): boolean {
  return cidrv6Contains(CIDR_UNIQUE_LOCAL, ip);
}

/**
 * Checks if an IPv6 address is a global unicast address (RFC 4291).
 *
 * Global unicast range: `2000::/3` (2000:: – 3fff:ffff:...:ffff)
 *
 * Note: This includes sub-ranges like documentation (`2001:db8::/32`),
 * Teredo (`2001::/32`), and benchmarking (`2001:2::/48`). Use the more
 * specific classifiers or {@link classifyIpv6} to distinguish them.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is in the global unicast range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6GlobalUnicast } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6GlobalUnicast(parseIpv6("2607:f8b0:4004:800::200e")));
 * assert(isIpv6GlobalUnicast(parseIpv6("2001:db8::1"))); // also documentation
 * assertEquals(isIpv6GlobalUnicast(parseIpv6("fe80::1")), false);
 * ```
 */
export function isIpv6GlobalUnicast(ip: bigint): boolean {
  return cidrv6Contains(CIDR_GLOBAL_UNICAST, ip);
}

/**
 * Checks if an IPv6 address is an IPv4-mapped address (RFC 4291).
 *
 * IPv4-mapped range: `::ffff:0:0/96` (::ffff:0.0.0.0 – ::ffff:255.255.255.255)
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is IPv4-mapped
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Ipv4Mapped } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Ipv4Mapped(parseIpv6("::ffff:192.168.1.1")));
 * assert(isIpv6Ipv4Mapped(parseIpv6("::ffff:c0a8:101")));
 * assertEquals(isIpv6Ipv4Mapped(parseIpv6("::1")), false);
 * ```
 */
export function isIpv6Ipv4Mapped(ip: bigint): boolean {
  return cidrv6Contains(CIDR_IPV4_MAPPED, ip);
}

/**
 * Checks if an IPv6 address is an IPv4-translated address (RFC 6052).
 *
 * IPv4-translated range: `64:ff9b::/96`
 *
 * Used by NAT64 for IPv4/IPv6 translation.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is IPv4-translated
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Ipv4Translated } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Ipv4Translated(parseIpv6("64:ff9b::1")));
 * assert(isIpv6Ipv4Translated(parseIpv6("64:ff9b::")));
 * assertEquals(isIpv6Ipv4Translated(parseIpv6("64:ff9a::1")), false);
 * ```
 */
export function isIpv6Ipv4Translated(ip: bigint): boolean {
  return cidrv6Contains(CIDR_IPV4_TRANSLATED, ip);
}

/**
 * Checks if an IPv6 address is in the documentation range (RFC 3849).
 *
 * Documentation range: `2001:db8::/32`
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is in the documentation range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Documentation } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Documentation(parseIpv6("2001:db8::1")));
 * assert(isIpv6Documentation(parseIpv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(isIpv6Documentation(parseIpv6("2001:db9::1")), false);
 * ```
 */
export function isIpv6Documentation(ip: bigint): boolean {
  return cidrv6Contains(CIDR_DOCUMENTATION, ip);
}

/**
 * Checks if an IPv6 address is a Teredo address (RFC 4380).
 *
 * Teredo range: `2001::/32`
 *
 * Note: This overlaps with documentation (`2001:db8::/32`), benchmarking
 * (`2001:2::/48`), and ORCHIDv2 (`2001:20::/28`) ranges. Use
 * {@link classifyIpv6} for the most specific classification.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is in the Teredo range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Teredo } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Teredo(parseIpv6("2001::1")));
 * assert(isIpv6Teredo(parseIpv6("2001:0:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(isIpv6Teredo(parseIpv6("2002::1")), false);
 * ```
 */
export function isIpv6Teredo(ip: bigint): boolean {
  return cidrv6Contains(CIDR_TEREDO, ip);
}

/**
 * Checks if an IPv6 address is in the benchmarking range (RFC 5180).
 *
 * Benchmarking range: `2001:2::/48`
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is in the benchmarking range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Benchmarking } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Benchmarking(parseIpv6("2001:2::1")));
 * assertEquals(isIpv6Benchmarking(parseIpv6("2001:3::1")), false);
 * ```
 */
export function isIpv6Benchmarking(ip: bigint): boolean {
  return cidrv6Contains(CIDR_BENCHMARKING, ip);
}

/**
 * Checks if an IPv6 address is an ORCHIDv2 address (RFC 7343).
 *
 * ORCHIDv2 range: `2001:20::/28`
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns `true` if the address is an ORCHIDv2 address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv6Orchidv2 } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assert(isIpv6Orchidv2(parseIpv6("2001:20::1")));
 * assert(isIpv6Orchidv2(parseIpv6("2001:2f:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(isIpv6Orchidv2(parseIpv6("2001:30::1")), false);
 * ```
 */
export function isIpv6Orchidv2(ip: bigint): boolean {
  return cidrv6Contains(CIDR_ORCHIDV2, ip);
}

/**
 * Classifies an IPv6 address into its well-known range.
 *
 * Returns the most specific classification label for the given address.
 * For overlapping ranges (e.g., `2001:db8::/32` within `2001::/32` within
 * `2000::/3`), the most specific match is returned.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns The classification label
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIpv6 } from "@hertzg/ip/classifyv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(classifyIpv6(parseIpv6("::1")), "loopback");
 * assertEquals(classifyIpv6(parseIpv6("::")), "unspecified");
 * assertEquals(classifyIpv6(parseIpv6("fe80::1")), "link-local");
 * assertEquals(classifyIpv6(parseIpv6("ff02::1")), "multicast");
 * assertEquals(classifyIpv6(parseIpv6("fd00::1")), "unique-local");
 * assertEquals(classifyIpv6(parseIpv6("2001:db8::1")), "documentation");
 * assertEquals(classifyIpv6(parseIpv6("2001:2::1")), "benchmarking");
 * assertEquals(classifyIpv6(parseIpv6("2001:20::1")), "orchidv2");
 * assertEquals(classifyIpv6(parseIpv6("2001::1")), "teredo");
 * assertEquals(classifyIpv6(parseIpv6("::ffff:192.168.1.1")), "ipv4-mapped");
 * assertEquals(classifyIpv6(parseIpv6("64:ff9b::1")), "ipv4-translated");
 * assertEquals(classifyIpv6(parseIpv6("2607:f8b0:4004:800::200e")), "global-unicast");
 * ```
 */
export function classifyIpv6(ip: bigint): ClassificationIpv6 {
  switch (true) {
    case isIpv6Loopback(ip):
      return "loopback";
    case isIpv6Unspecified(ip):
      return "unspecified";
    case isIpv6Ipv4Mapped(ip):
      return "ipv4-mapped";
    case isIpv6Ipv4Translated(ip):
      return "ipv4-translated";
    case isIpv6Documentation(ip):
      return "documentation";
    case isIpv6Benchmarking(ip):
      return "benchmarking";
    case isIpv6Orchidv2(ip):
      return "orchidv2";
    case isIpv6Teredo(ip):
      return "teredo";
    case isIpv6LinkLocal(ip):
      return "link-local";
    case isIpv6Multicast(ip):
      return "multicast";
    case isIpv6UniqueLocal(ip):
      return "unique-local";
    case isIpv6GlobalUnicast(ip):
      return "global-unicast";
    default:
      return "unassigned";
  }
}
