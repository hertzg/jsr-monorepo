/**
 * IPv4 address classification utilities.
 *
 * This module provides functions to classify IPv4 addresses into well-known
 * ranges defined by IANA and various RFCs. Each function checks if an IPv4
 * address (as a 32-bit unsigned integer) belongs to a specific range.
 *
 * @example Classify an IPv4 address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddressv4 } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(classifyAddressv4(parseAddressv4("192.168.1.1").address), "private");
 * assertEquals(classifyAddressv4(parseAddressv4("8.8.8.8").address), "public");
 * assertEquals(classifyAddressv4(parseAddressv4("127.0.0.1").address), "loopback");
 * assertEquals(classifyAddressv4(parseAddressv4("224.0.0.1").address), "multicast");
 * ```
 *
 * @example Check specific ranges
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Loopback, isAddressv4Private, isAddressv4Public } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Loopback(parseAddressv4("127.0.0.1").address));
 * assert(isAddressv4Private(parseAddressv4("10.0.0.1").address));
 * assertEquals(isAddressv4Public(parseAddressv4("10.0.0.1").address), false);
 * assert(isAddressv4Public(parseAddressv4("8.8.8.8").address));
 * ```
 *
 * @module
 */

import { type Cidrv4, cidrv4Contains, parseCidrv4 } from "./cidrv4.ts";

// Precomputed CIDR blocks for range checks.
const CIDR_THIS_NETWORK: Cidrv4 = parseCidrv4("0.0.0.0/8");
const CIDR_PRIVATE_10: Cidrv4 = parseCidrv4("10.0.0.0/8");
const CIDR_CG_NAT: Cidrv4 = parseCidrv4("100.64.0.0/10");
const CIDR_LOOPBACK: Cidrv4 = parseCidrv4("127.0.0.0/8");
const CIDR_LINK_LOCAL: Cidrv4 = parseCidrv4("169.254.0.0/16");
const CIDR_PRIVATE_172: Cidrv4 = parseCidrv4("172.16.0.0/12");
const CIDR_DOC_1: Cidrv4 = parseCidrv4("192.0.2.0/24");
const CIDR_PRIVATE_192: Cidrv4 = parseCidrv4("192.168.0.0/16");
const CIDR_BENCHMARKING: Cidrv4 = parseCidrv4("198.18.0.0/15");
const CIDR_DOC_2: Cidrv4 = parseCidrv4("198.51.100.0/24");
const CIDR_DOC_3: Cidrv4 = parseCidrv4("203.0.113.0/24");
const CIDR_MULTICAST: Cidrv4 = parseCidrv4("224.0.0.0/4");
const CIDR_RESERVED: Cidrv4 = parseCidrv4("240.0.0.0/4");
const CIDR_BROADCAST: Cidrv4 = parseCidrv4("255.255.255.255/32");

/**
 * All possible IPv4 address classification labels.
 *
 * Returned by {@link classifyAddressv4} to identify which well-known range
 * an IPv4 address belongs to.
 */
export type Classificationv4 =
  | "broadcast"
  | "this-network"
  | "loopback"
  | "link-local"
  | "documentation"
  | "benchmarking"
  | "cg-nat"
  | "private"
  | "multicast"
  | "reserved"
  | "public";

/**
 * Checks if an IPv4 address is in a private range (RFC 1918).
 *
 * Private ranges:
 * - `10.0.0.0/8` (10.0.0.0 – 10.255.255.255)
 * - `172.16.0.0/12` (172.16.0.0 – 172.31.255.255)
 * - `192.168.0.0/16` (192.168.0.0 – 192.168.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is in a private range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Private } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Private(parseAddressv4("10.0.0.1").address));
 * assert(isAddressv4Private(parseAddressv4("172.16.0.1").address));
 * assert(isAddressv4Private(parseAddressv4("192.168.1.1").address));
 * assertEquals(isAddressv4Private(parseAddressv4("8.8.8.8").address), false);
 * ```
 */
export function isAddressv4Private(address: number): boolean {
  return cidrv4Contains(CIDR_PRIVATE_10, address) ||
    cidrv4Contains(CIDR_PRIVATE_172, address) ||
    cidrv4Contains(CIDR_PRIVATE_192, address);
}

/**
 * Checks if an IPv4 address is a loopback address (RFC 1122).
 *
 * Loopback range: `127.0.0.0/8` (127.0.0.0 – 127.255.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is a loopback address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Loopback } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Loopback(parseAddressv4("127.0.0.1").address));
 * assert(isAddressv4Loopback(parseAddressv4("127.255.255.255").address));
 * assertEquals(isAddressv4Loopback(parseAddressv4("128.0.0.1").address), false);
 * ```
 */
export function isAddressv4Loopback(address: number): boolean {
  return cidrv4Contains(CIDR_LOOPBACK, address);
}

/**
 * Checks if an IPv4 address is a link-local address (RFC 3927).
 *
 * Link-local range: `169.254.0.0/16` (169.254.0.0 – 169.254.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is link-local
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4LinkLocal } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4LinkLocal(parseAddressv4("169.254.1.1").address));
 * assertEquals(isAddressv4LinkLocal(parseAddressv4("169.255.0.0").address), false);
 * ```
 */
export function isAddressv4LinkLocal(address: number): boolean {
  return cidrv4Contains(CIDR_LINK_LOCAL, address);
}

/**
 * Checks if an IPv4 address is a multicast address (RFC 5771).
 *
 * Multicast range: `224.0.0.0/4` (224.0.0.0 – 239.255.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is multicast
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Multicast } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Multicast(parseAddressv4("224.0.0.1").address));
 * assert(isAddressv4Multicast(parseAddressv4("239.255.255.255").address));
 * assertEquals(isAddressv4Multicast(parseAddressv4("240.0.0.0").address), false);
 * ```
 */
export function isAddressv4Multicast(address: number): boolean {
  return cidrv4Contains(CIDR_MULTICAST, address);
}

/**
 * Checks if an IPv4 address is in the reserved range (RFC 1112).
 *
 * Reserved range: `240.0.0.0/4` (240.0.0.0 – 255.255.255.254),
 * excluding the broadcast address `255.255.255.255`.
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is reserved
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Reserved } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Reserved(parseAddressv4("240.0.0.0").address));
 * assert(isAddressv4Reserved(parseAddressv4("255.255.255.254").address));
 * assertEquals(isAddressv4Reserved(parseAddressv4("255.255.255.255").address), false); // broadcast
 * assertEquals(isAddressv4Reserved(parseAddressv4("239.255.255.255").address), false); // multicast
 * ```
 */
export function isAddressv4Reserved(address: number): boolean {
  return cidrv4Contains(CIDR_RESERVED, address) &&
    !cidrv4Contains(CIDR_BROADCAST, address);
}

/**
 * Checks if an IPv4 address is the limited broadcast address.
 *
 * Broadcast address: `255.255.255.255`
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is the broadcast address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Broadcast } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Broadcast(parseAddressv4("255.255.255.255").address));
 * assertEquals(isAddressv4Broadcast(parseAddressv4("255.255.255.254").address), false);
 * ```
 */
export function isAddressv4Broadcast(address: number): boolean {
  return cidrv4Contains(CIDR_BROADCAST, address);
}

/**
 * Checks if an IPv4 address is in the "this network" range (RFC 791).
 *
 * This network range: `0.0.0.0/8` (0.0.0.0 – 0.255.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is in the "this network" range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4ThisNetwork } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4ThisNetwork(parseAddressv4("0.0.0.0").address));
 * assert(isAddressv4ThisNetwork(parseAddressv4("0.255.255.255").address));
 * assertEquals(isAddressv4ThisNetwork(parseAddressv4("1.0.0.0").address), false);
 * ```
 */
export function isAddressv4ThisNetwork(address: number): boolean {
  return cidrv4Contains(CIDR_THIS_NETWORK, address);
}

/**
 * Checks if an IPv4 address is in the Carrier-Grade NAT range (RFC 6598).
 *
 * CG-NAT range: `100.64.0.0/10` (100.64.0.0 – 100.127.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is in the CG-NAT range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4CgNat } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4CgNat(parseAddressv4("100.64.0.0").address));
 * assert(isAddressv4CgNat(parseAddressv4("100.127.255.255").address));
 * assertEquals(isAddressv4CgNat(parseAddressv4("100.128.0.0").address), false);
 * ```
 */
export function isAddressv4CgNat(address: number): boolean {
  return cidrv4Contains(CIDR_CG_NAT, address);
}

/**
 * Checks if an IPv4 address is in the benchmarking range (RFC 2544).
 *
 * Benchmarking range: `198.18.0.0/15` (198.18.0.0 – 198.19.255.255)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is in the benchmarking range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Benchmarking } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Benchmarking(parseAddressv4("198.18.0.0").address));
 * assert(isAddressv4Benchmarking(parseAddressv4("198.19.255.255").address));
 * assertEquals(isAddressv4Benchmarking(parseAddressv4("198.20.0.0").address), false);
 * ```
 */
export function isAddressv4Benchmarking(address: number): boolean {
  return cidrv4Contains(CIDR_BENCHMARKING, address);
}

/**
 * Checks if an IPv4 address is in a documentation range (RFC 5737).
 *
 * Documentation ranges:
 * - `192.0.2.0/24` (TEST-NET-1)
 * - `198.51.100.0/24` (TEST-NET-2)
 * - `203.0.113.0/24` (TEST-NET-3)
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is in a documentation range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Documentation } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Documentation(parseAddressv4("192.0.2.1").address));
 * assert(isAddressv4Documentation(parseAddressv4("198.51.100.1").address));
 * assert(isAddressv4Documentation(parseAddressv4("203.0.113.1").address));
 * assertEquals(isAddressv4Documentation(parseAddressv4("192.0.3.0").address), false);
 * ```
 */
export function isAddressv4Documentation(address: number): boolean {
  return cidrv4Contains(CIDR_DOC_1, address) ||
    cidrv4Contains(CIDR_DOC_2, address) ||
    cidrv4Contains(CIDR_DOC_3, address);
}

/**
 * Checks if an IPv4 address is a public (globally routable) address.
 *
 * Returns `true` if the address does not belong to any well-known
 * special-purpose range (private, loopback, link-local, multicast,
 * reserved, broadcast, this-network, CG-NAT, benchmarking, or documentation).
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns `true` if the address is publicly routable
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isAddressv4Public } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assert(isAddressv4Public(parseAddressv4("8.8.8.8").address));
 * assert(isAddressv4Public(parseAddressv4("1.1.1.1").address));
 * assertEquals(isAddressv4Public(parseAddressv4("10.0.0.1").address), false);
 * assertEquals(isAddressv4Public(parseAddressv4("127.0.0.1").address), false);
 * ```
 */
export function isAddressv4Public(address: number): boolean {
  return !isAddressv4Private(address) && !isAddressv4Loopback(address) &&
    !isAddressv4LinkLocal(address) && !isAddressv4Multicast(address) &&
    !isAddressv4Reserved(address) && !isAddressv4Broadcast(address) &&
    !isAddressv4ThisNetwork(address) && !isAddressv4CgNat(address) &&
    !isAddressv4Benchmarking(address) && !isAddressv4Documentation(address);
}

/**
 * Classifies an IPv4 address into its well-known range.
 *
 * Returns the most specific classification label for the given address.
 * Every valid 32-bit unsigned integer maps to exactly one classification.
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns The classification label
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddressv4 } from "@hertzg/ip/classifyv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(classifyAddressv4(parseAddressv4("192.168.1.1").address), "private");
 * assertEquals(classifyAddressv4(parseAddressv4("8.8.8.8").address), "public");
 * assertEquals(classifyAddressv4(parseAddressv4("127.0.0.1").address), "loopback");
 * assertEquals(classifyAddressv4(parseAddressv4("169.254.1.1").address), "link-local");
 * assertEquals(classifyAddressv4(parseAddressv4("224.0.0.1").address), "multicast");
 * assertEquals(classifyAddressv4(parseAddressv4("255.255.255.255").address), "broadcast");
 * assertEquals(classifyAddressv4(parseAddressv4("0.0.0.0").address), "this-network");
 * assertEquals(classifyAddressv4(parseAddressv4("100.64.0.1").address), "cg-nat");
 * assertEquals(classifyAddressv4(parseAddressv4("198.18.0.1").address), "benchmarking");
 * assertEquals(classifyAddressv4(parseAddressv4("192.0.2.1").address), "documentation");
 * assertEquals(classifyAddressv4(parseAddressv4("240.0.0.0").address), "reserved");
 * ```
 */
export function classifyAddressv4(address: number): Classificationv4 {
  switch (true) {
    case isAddressv4Broadcast(address):
      return "broadcast";
    case isAddressv4ThisNetwork(address):
      return "this-network";
    case isAddressv4Loopback(address):
      return "loopback";
    case isAddressv4LinkLocal(address):
      return "link-local";
    case isAddressv4Documentation(address):
      return "documentation";
    case isAddressv4Benchmarking(address):
      return "benchmarking";
    case isAddressv4CgNat(address):
      return "cg-nat";
    case isAddressv4Private(address):
      return "private";
    case isAddressv4Multicast(address):
      return "multicast";
    case isAddressv4Reserved(address):
      return "reserved";
    default:
      return "public";
  }
}
