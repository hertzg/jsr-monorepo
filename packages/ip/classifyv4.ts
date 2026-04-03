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
 * import { classifyIpv4 } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(classifyIpv4(parseIpv4("192.168.1.1")), "private");
 * assertEquals(classifyIpv4(parseIpv4("8.8.8.8")), "public");
 * assertEquals(classifyIpv4(parseIpv4("127.0.0.1")), "loopback");
 * assertEquals(classifyIpv4(parseIpv4("224.0.0.1")), "multicast");
 * ```
 *
 * @example Check specific ranges
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Loopback, isIpv4Private, isIpv4Public } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Loopback(parseIpv4("127.0.0.1")));
 * assert(isIpv4Private(parseIpv4("10.0.0.1")));
 * assertEquals(isIpv4Public(parseIpv4("10.0.0.1")), false);
 * assert(isIpv4Public(parseIpv4("8.8.8.8")));
 * ```
 *
 * @module
 */

/**
 * All possible IPv4 address classification labels.
 *
 * Returned by {@link classifyIpv4} to identify which well-known range
 * an IPv4 address belongs to.
 */
export type Ipv4Classification =
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
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is in a private range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Private } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Private(parseIpv4("10.0.0.1")));
 * assert(isIpv4Private(parseIpv4("172.16.0.1")));
 * assert(isIpv4Private(parseIpv4("192.168.1.1")));
 * assertEquals(isIpv4Private(parseIpv4("8.8.8.8")), false);
 * ```
 */
export function isIpv4Private(ip: number): boolean {
  return ((ip & 0xFF000000) >>> 0) === 0x0A000000 || // 10.0.0.0/8
    ((ip & 0xFFF00000) >>> 0) === 0xAC100000 || // 172.16.0.0/12
    ((ip & 0xFFFF0000) >>> 0) === 0xC0A80000; // 192.168.0.0/16
}

/**
 * Checks if an IPv4 address is a loopback address (RFC 1122).
 *
 * Loopback range: `127.0.0.0/8` (127.0.0.0 – 127.255.255.255)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is a loopback address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Loopback } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Loopback(parseIpv4("127.0.0.1")));
 * assert(isIpv4Loopback(parseIpv4("127.255.255.255")));
 * assertEquals(isIpv4Loopback(parseIpv4("128.0.0.1")), false);
 * ```
 */
export function isIpv4Loopback(ip: number): boolean {
  return ((ip & 0xFF000000) >>> 0) === 0x7F000000;
}

/**
 * Checks if an IPv4 address is a link-local address (RFC 3927).
 *
 * Link-local range: `169.254.0.0/16` (169.254.0.0 – 169.254.255.255)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is link-local
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4LinkLocal } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4LinkLocal(parseIpv4("169.254.1.1")));
 * assertEquals(isIpv4LinkLocal(parseIpv4("169.255.0.0")), false);
 * ```
 */
export function isIpv4LinkLocal(ip: number): boolean {
  return ((ip & 0xFFFF0000) >>> 0) === 0xA9FE0000;
}

/**
 * Checks if an IPv4 address is a multicast address (RFC 5771).
 *
 * Multicast range: `224.0.0.0/4` (224.0.0.0 – 239.255.255.255)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is multicast
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Multicast } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Multicast(parseIpv4("224.0.0.1")));
 * assert(isIpv4Multicast(parseIpv4("239.255.255.255")));
 * assertEquals(isIpv4Multicast(parseIpv4("240.0.0.0")), false);
 * ```
 */
export function isIpv4Multicast(ip: number): boolean {
  return ((ip & 0xF0000000) >>> 0) === 0xE0000000;
}

/**
 * Checks if an IPv4 address is in the reserved range (RFC 1112).
 *
 * Reserved range: `240.0.0.0/4` (240.0.0.0 – 255.255.255.254),
 * excluding the broadcast address `255.255.255.255`.
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is reserved
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Reserved } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Reserved(parseIpv4("240.0.0.0")));
 * assert(isIpv4Reserved(parseIpv4("255.255.255.254")));
 * assertEquals(isIpv4Reserved(parseIpv4("255.255.255.255")), false); // broadcast
 * assertEquals(isIpv4Reserved(parseIpv4("239.255.255.255")), false); // multicast
 * ```
 */
export function isIpv4Reserved(ip: number): boolean {
  return ((ip & 0xF0000000) >>> 0) === 0xF0000000 &&
    (ip >>> 0) !== 0xFFFFFFFF;
}

/**
 * Checks if an IPv4 address is the limited broadcast address.
 *
 * Broadcast address: `255.255.255.255`
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is the broadcast address
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Broadcast } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Broadcast(parseIpv4("255.255.255.255")));
 * assertEquals(isIpv4Broadcast(parseIpv4("255.255.255.254")), false);
 * ```
 */
export function isIpv4Broadcast(ip: number): boolean {
  return (ip >>> 0) === 0xFFFFFFFF;
}

/**
 * Checks if an IPv4 address is in the "this network" range (RFC 791).
 *
 * This network range: `0.0.0.0/8` (0.0.0.0 – 0.255.255.255)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is in the "this network" range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4ThisNetwork } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4ThisNetwork(parseIpv4("0.0.0.0")));
 * assert(isIpv4ThisNetwork(parseIpv4("0.255.255.255")));
 * assertEquals(isIpv4ThisNetwork(parseIpv4("1.0.0.0")), false);
 * ```
 */
export function isIpv4ThisNetwork(ip: number): boolean {
  return ((ip & 0xFF000000) >>> 0) === 0;
}

/**
 * Checks if an IPv4 address is in the Carrier-Grade NAT range (RFC 6598).
 *
 * CG-NAT range: `100.64.0.0/10` (100.64.0.0 – 100.127.255.255)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is in the CG-NAT range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4CgNat } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4CgNat(parseIpv4("100.64.0.0")));
 * assert(isIpv4CgNat(parseIpv4("100.127.255.255")));
 * assertEquals(isIpv4CgNat(parseIpv4("100.128.0.0")), false);
 * ```
 */
export function isIpv4CgNat(ip: number): boolean {
  return ((ip & 0xFFC00000) >>> 0) === 0x64400000;
}

/**
 * Checks if an IPv4 address is in the benchmarking range (RFC 2544).
 *
 * Benchmarking range: `198.18.0.0/15` (198.18.0.0 – 198.19.255.255)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is in the benchmarking range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Benchmarking } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Benchmarking(parseIpv4("198.18.0.0")));
 * assert(isIpv4Benchmarking(parseIpv4("198.19.255.255")));
 * assertEquals(isIpv4Benchmarking(parseIpv4("198.20.0.0")), false);
 * ```
 */
export function isIpv4Benchmarking(ip: number): boolean {
  return ((ip & 0xFFFE0000) >>> 0) === 0xC6120000;
}

/**
 * Checks if an IPv4 address is in a documentation range (RFC 5737).
 *
 * Documentation ranges:
 * - `192.0.2.0/24` (TEST-NET-1)
 * - `198.51.100.0/24` (TEST-NET-2)
 * - `203.0.113.0/24` (TEST-NET-3)
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is in a documentation range
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Documentation } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Documentation(parseIpv4("192.0.2.1")));
 * assert(isIpv4Documentation(parseIpv4("198.51.100.1")));
 * assert(isIpv4Documentation(parseIpv4("203.0.113.1")));
 * assertEquals(isIpv4Documentation(parseIpv4("192.0.3.0")), false);
 * ```
 */
export function isIpv4Documentation(ip: number): boolean {
  return ((ip & 0xFFFFFF00) >>> 0) === 0xC0000200 || // 192.0.2.0/24
    ((ip & 0xFFFFFF00) >>> 0) === 0xC6336400 || // 198.51.100.0/24
    ((ip & 0xFFFFFF00) >>> 0) === 0xCB007100; // 203.0.113.0/24
}

/**
 * Checks if an IPv4 address is a public (globally routable) address.
 *
 * Returns `true` if the address does not belong to any well-known
 * special-purpose range (private, loopback, link-local, multicast,
 * reserved, broadcast, this-network, CG-NAT, benchmarking, or documentation).
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns `true` if the address is publicly routable
 *
 * @example
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isIpv4Public } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isIpv4Public(parseIpv4("8.8.8.8")));
 * assert(isIpv4Public(parseIpv4("1.1.1.1")));
 * assertEquals(isIpv4Public(parseIpv4("10.0.0.1")), false);
 * assertEquals(isIpv4Public(parseIpv4("127.0.0.1")), false);
 * ```
 */
export function isIpv4Public(ip: number): boolean {
  return !isIpv4Private(ip) && !isIpv4Loopback(ip) &&
    !isIpv4LinkLocal(ip) && !isIpv4Multicast(ip) &&
    !isIpv4Reserved(ip) && !isIpv4Broadcast(ip) &&
    !isIpv4ThisNetwork(ip) && !isIpv4CgNat(ip) &&
    !isIpv4Benchmarking(ip) && !isIpv4Documentation(ip);
}

/**
 * Classifies an IPv4 address into its well-known range.
 *
 * Returns the most specific classification label for the given address.
 * Every valid 32-bit unsigned integer maps to exactly one classification.
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns The classification label
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIpv4 } from "@hertzg/ip/classifyv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(classifyIpv4(parseIpv4("192.168.1.1")), "private");
 * assertEquals(classifyIpv4(parseIpv4("8.8.8.8")), "public");
 * assertEquals(classifyIpv4(parseIpv4("127.0.0.1")), "loopback");
 * assertEquals(classifyIpv4(parseIpv4("169.254.1.1")), "link-local");
 * assertEquals(classifyIpv4(parseIpv4("224.0.0.1")), "multicast");
 * assertEquals(classifyIpv4(parseIpv4("255.255.255.255")), "broadcast");
 * assertEquals(classifyIpv4(parseIpv4("0.0.0.0")), "this-network");
 * assertEquals(classifyIpv4(parseIpv4("100.64.0.1")), "cg-nat");
 * assertEquals(classifyIpv4(parseIpv4("198.18.0.1")), "benchmarking");
 * assertEquals(classifyIpv4(parseIpv4("192.0.2.1")), "documentation");
 * assertEquals(classifyIpv4(parseIpv4("240.0.0.0")), "reserved");
 * ```
 */
export function classifyIpv4(ip: number): Ipv4Classification {
  if (isIpv4Broadcast(ip)) return "broadcast";
  if (isIpv4ThisNetwork(ip)) return "this-network";
  if (isIpv4Loopback(ip)) return "loopback";
  if (isIpv4LinkLocal(ip)) return "link-local";
  if (isIpv4Documentation(ip)) return "documentation";
  if (isIpv4Benchmarking(ip)) return "benchmarking";
  if (isIpv4CgNat(ip)) return "cg-nat";
  if (isIpv4Private(ip)) return "private";
  if (isIpv4Multicast(ip)) return "multicast";
  if (isIpv4Reserved(ip)) return "reserved";
  return "public";
}
