/**
 * IPv4 reverse DNS pointer names.
 *
 * This module provides {@link ipv4ToArpa}, which builds the `in-addr.arpa`
 * name a `PTR` record for an IPv4 address lives at (RFC 1035 §3.5).
 *
 * For the IPv6 and universal forms, see:
 * - [`arpav6`](https://jsr.io/@hertzg/ip/doc/arpav6): {@link ipv6ToArpa}
 * - [`arpa`](https://jsr.io/@hertzg/ip/doc/arpa): {@link ipToArpa}
 *
 * The name is relative -- no trailing dot. See ADR 0014.
 *
 * @example Build the name a PTR record lives at
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToArpa } from "@hertzg/ip/arpav4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4ToArpa(parseIpv4("192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * ```
 *
 * @module
 */

import { stringifyIpv4 } from "./ipv4.ts";

/**
 * Builds the reverse DNS pointer name of an IPv4 address.
 *
 * The four octets are written in reverse order under `in-addr.arpa`, as
 * RFC 1035 §3.5 specifies.
 *
 * The name is **relative** — it carries no trailing dot. Append `"."` if a
 * resolver requires an absolute name.
 *
 * @param address The address as a 32-bit number
 * @returns The `in-addr.arpa` name, without a trailing dot
 * @throws {RangeError} If the address is negative, fractional, or greater
 *   than 2^32-1
 *
 * @example Building the name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToArpa } from "@hertzg/ip/arpav4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4ToArpa(parseIpv4("192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * assertEquals(ipv4ToArpa(parseIpv4("0.0.0.0")), "0.0.0.0.in-addr.arpa");
 * assertEquals(ipv4ToArpa(parseIpv4("255.255.255.255")), "255.255.255.255.in-addr.arpa");
 * ```
 *
 * @example The name is relative, so make it absolute yourself
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToArpa } from "@hertzg/ip/arpav4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4ToArpa(parseIpv4("8.8.8.8")) + ".", "8.8.8.8.in-addr.arpa.");
 * ```
 */
export function ipv4ToArpa(address: number): string {
  const [first, second, third, fourth] = stringifyIpv4(address).split(".");
  return `${fourth}.${third}.${second}.${first}.in-addr.arpa`;
}
