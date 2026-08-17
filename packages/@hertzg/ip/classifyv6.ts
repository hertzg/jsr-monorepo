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
 * import { classifyAddressv6 } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(classifyAddressv6(parseAddressv6("::1")), "loopback");
 * assertEquals(classifyAddressv6(parseAddressv6("2001:db8::1")), "documentation");
 * assertEquals(classifyAddressv6(parseAddressv6("fe80::1")), "link-local");
 * assertEquals(classifyAddressv6(parseAddressv6("2607:f8b0:4004:800::200e")), "global-unicast");
 * ```
 *
 * @example Check specific ranges
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Loopback, isAddressv6UniqueLocal } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Loopback(parseAddressv6("::1")));
 * assert(isAddressv6UniqueLocal(parseAddressv6("fd00::1")));
 * assertEquals(isAddressv6Loopback(parseAddressv6("::2")), false);
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
 * Returned by {@link classifyAddressv6} to identify which well-known range
 * an IPv6 address belongs to.
 */
export type Classificationv6 =
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
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is the loopback address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Loopback } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Loopback(parseAddressv6("::1")));
 * assertEquals(isAddressv6Loopback(parseAddressv6("::")), false);
 * assertEquals(isAddressv6Loopback(parseAddressv6("::2")), false);
 * ```
 */
export function isAddressv6Loopback(address: bigint): boolean {
  return cidrv6Contains(CIDR_LOOPBACK, address);
}

/**
 * Checks if an IPv6 address is the unspecified address (RFC 4291).
 *
 * Unspecified: `::`
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is the unspecified address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Unspecified } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Unspecified(parseAddressv6("::")));
 * assertEquals(isAddressv6Unspecified(parseAddressv6("::1")), false);
 * ```
 */
export function isAddressv6Unspecified(address: bigint): boolean {
  return cidrv6Contains(CIDR_UNSPECIFIED, address);
}

/**
 * Checks if an IPv6 address is a link-local address (RFC 4291).
 *
 * Link-local range: `fe80::/10` (fe80:: – febf:ffff:...:ffff)
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is link-local
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6LinkLocal } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6LinkLocal(parseAddressv6("fe80::1")));
 * assert(isAddressv6LinkLocal(parseAddressv6("fe80::")));
 * assertEquals(isAddressv6LinkLocal(parseAddressv6("fec0::1")), false);
 * ```
 */
export function isAddressv6LinkLocal(address: bigint): boolean {
  return cidrv6Contains(CIDR_LINK_LOCAL, address);
}

/**
 * Checks if an IPv6 address is a multicast address (RFC 4291).
 *
 * Multicast range: `ff00::/8` (ff00:: – ffff:ffff:...:ffff)
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is multicast
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Multicast } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Multicast(parseAddressv6("ff02::1")));
 * assert(isAddressv6Multicast(parseAddressv6("ff00::")));
 * assertEquals(isAddressv6Multicast(parseAddressv6("fe80::1")), false);
 * ```
 */
export function isAddressv6Multicast(address: bigint): boolean {
  return cidrv6Contains(CIDR_MULTICAST, address);
}

/**
 * Checks if an IPv6 address is a unique local address (RFC 4193).
 *
 * Unique local range: `fc00::/7` (fc00:: – fdff:ffff:...:ffff)
 *
 * This is the IPv6 equivalent of IPv4 private addresses (RFC 1918).
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is unique local
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6UniqueLocal } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6UniqueLocal(parseAddressv6("fc00::1")));
 * assert(isAddressv6UniqueLocal(parseAddressv6("fd00::1")));
 * assertEquals(isAddressv6UniqueLocal(parseAddressv6("fe00::1")), false);
 * ```
 */
export function isAddressv6UniqueLocal(address: bigint): boolean {
  return cidrv6Contains(CIDR_UNIQUE_LOCAL, address);
}

/**
 * Checks if an IPv6 address is a global unicast address (RFC 4291).
 *
 * Global unicast range: `2000::/3` (2000:: – 3fff:ffff:...:ffff)
 *
 * Note: This includes sub-ranges like documentation (`2001:db8::/32`),
 * Teredo (`2001::/32`), and benchmarking (`2001:2::/48`). Use the more
 * specific classifiers or {@link classifyAddressv6} to distinguish them.
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is in the global unicast range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6GlobalUnicast } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6GlobalUnicast(parseAddressv6("2607:f8b0:4004:800::200e")));
 * assert(isAddressv6GlobalUnicast(parseAddressv6("2001:db8::1"))); // also documentation
 * assertEquals(isAddressv6GlobalUnicast(parseAddressv6("fe80::1")), false);
 * ```
 */
export function isAddressv6GlobalUnicast(address: bigint): boolean {
  return cidrv6Contains(CIDR_GLOBAL_UNICAST, address);
}

/**
 * Checks if an IPv6 address is an IPv4-mapped address (RFC 4291).
 *
 * IPv4-mapped range: `::ffff:0:0/96` (::ffff:0.0.0.0 – ::ffff:255.255.255.255)
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is IPv4-mapped
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Mapped } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Mapped(parseAddressv6("::ffff:192.168.1.1")));
 * assert(isAddressv6Mapped(parseAddressv6("::ffff:c0a8:101")));
 * assertEquals(isAddressv6Mapped(parseAddressv6("::1")), false);
 * ```
 */
export function isAddressv6Mapped(address: bigint): boolean {
  return cidrv6Contains(CIDR_IPV4_MAPPED, address);
}

/**
 * Checks if an IPv6 address is an IPv4-translated address (RFC 6052).
 *
 * IPv4-translated range: `64:ff9b::/96`
 *
 * Used by NAT64 for IPv4/IPv6 translation.
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is IPv4-translated
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Translated } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Translated(parseAddressv6("64:ff9b::1")));
 * assert(isAddressv6Translated(parseAddressv6("64:ff9b::")));
 * assertEquals(isAddressv6Translated(parseAddressv6("64:ff9a::1")), false);
 * ```
 */
export function isAddressv6Translated(address: bigint): boolean {
  return cidrv6Contains(CIDR_IPV4_TRANSLATED, address);
}

/**
 * Checks if an IPv6 address is in the documentation range (RFC 3849).
 *
 * Documentation range: `2001:db8::/32`
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is in the documentation range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Documentation } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Documentation(parseAddressv6("2001:db8::1")));
 * assert(isAddressv6Documentation(parseAddressv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(isAddressv6Documentation(parseAddressv6("2001:db9::1")), false);
 * ```
 */
export function isAddressv6Documentation(address: bigint): boolean {
  return cidrv6Contains(CIDR_DOCUMENTATION, address);
}

/**
 * Checks if an IPv6 address is a Teredo address (RFC 4380).
 *
 * Teredo range: `2001::/32`
 *
 * Note: This overlaps with documentation (`2001:db8::/32`), benchmarking
 * (`2001:2::/48`), and ORCHIDv2 (`2001:20::/28`) ranges. Use
 * {@link classifyAddressv6} for the most specific classification.
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is in the Teredo range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Teredo } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Teredo(parseAddressv6("2001::1")));
 * assert(isAddressv6Teredo(parseAddressv6("2001:0:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(isAddressv6Teredo(parseAddressv6("2002::1")), false);
 * ```
 */
export function isAddressv6Teredo(address: bigint): boolean {
  return cidrv6Contains(CIDR_TEREDO, address);
}

/**
 * Checks if an IPv6 address is in the benchmarking range (RFC 5180).
 *
 * Benchmarking range: `2001:2::/48`
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is in the benchmarking range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Benchmarking } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Benchmarking(parseAddressv6("2001:2::1")));
 * assertEquals(isAddressv6Benchmarking(parseAddressv6("2001:3::1")), false);
 * ```
 */
export function isAddressv6Benchmarking(address: bigint): boolean {
  return cidrv6Contains(CIDR_BENCHMARKING, address);
}

/**
 * Checks if an IPv6 address is an ORCHIDv2 address (RFC 7343).
 *
 * ORCHIDv2 range: `2001:20::/28`
 *
 * @param address The address as a 128-bit bigint
 * @returns `true` if the address is an ORCHIDv2 address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv6Orchidv2 } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(isAddressv6Orchidv2(parseAddressv6("2001:20::1")));
 * assert(isAddressv6Orchidv2(parseAddressv6("2001:2f:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(isAddressv6Orchidv2(parseAddressv6("2001:30::1")), false);
 * ```
 */
export function isAddressv6Orchidv2(address: bigint): boolean {
  return cidrv6Contains(CIDR_ORCHIDV2, address);
}

/**
 * Classifies an IPv6 address into its well-known range.
 *
 * Returns the most specific classification label for the given address.
 * For overlapping ranges (e.g., `2001:db8::/32` within `2001::/32` within
 * `2000::/3`), the most specific match is returned.
 *
 * @param address The address as a 128-bit bigint
 * @returns The classification label
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddressv6 } from "@hertzg/ip/classifyv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(classifyAddressv6(parseAddressv6("::1")), "loopback");
 * assertEquals(classifyAddressv6(parseAddressv6("::")), "unspecified");
 * assertEquals(classifyAddressv6(parseAddressv6("fe80::1")), "link-local");
 * assertEquals(classifyAddressv6(parseAddressv6("ff02::1")), "multicast");
 * assertEquals(classifyAddressv6(parseAddressv6("fd00::1")), "unique-local");
 * assertEquals(classifyAddressv6(parseAddressv6("2001:db8::1")), "documentation");
 * assertEquals(classifyAddressv6(parseAddressv6("2001:2::1")), "benchmarking");
 * assertEquals(classifyAddressv6(parseAddressv6("2001:20::1")), "orchidv2");
 * assertEquals(classifyAddressv6(parseAddressv6("2001::1")), "teredo");
 * assertEquals(classifyAddressv6(parseAddressv6("::ffff:192.168.1.1")), "ipv4-mapped");
 * assertEquals(classifyAddressv6(parseAddressv6("64:ff9b::1")), "ipv4-translated");
 * assertEquals(classifyAddressv6(parseAddressv6("2607:f8b0:4004:800::200e")), "global-unicast");
 * ```
 */
export function classifyAddressv6(address: bigint): Classificationv6 {
  switch (true) {
    case isAddressv6Loopback(address):
      return "loopback";
    case isAddressv6Unspecified(address):
      return "unspecified";
    case isAddressv6Mapped(address):
      return "ipv4-mapped";
    case isAddressv6Translated(address):
      return "ipv4-translated";
    case isAddressv6Documentation(address):
      return "documentation";
    case isAddressv6Benchmarking(address):
      return "benchmarking";
    case isAddressv6Orchidv2(address):
      return "orchidv2";
    case isAddressv6Teredo(address):
      return "teredo";
    case isAddressv6LinkLocal(address):
      return "link-local";
    case isAddressv6Multicast(address):
      return "multicast";
    case isAddressv6UniqueLocal(address):
      return "unique-local";
    case isAddressv6GlobalUnicast(address):
      return "global-unicast";
    default:
      return "unassigned";
  }
}
