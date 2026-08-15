/**
 * Reverse DNS pointer names for IP addresses.
 *
 * This module provides {@link ipv4ToArpa}, {@link ipv6ToArpa} and the
 * universal {@link ipToArpa}, which build the name a `PTR` record for an
 * address lives at: the four IPv4 octets reversed under `in-addr.arpa`
 * (RFC 1035 §3.5), or all 32 IPv6 nibbles reversed under `ip6.arpa`
 * (RFC 3596 §2.5).
 *
 * ## The names are relative
 *
 * No trailing dot. `1.0.168.192.in-addr.arpa`, not
 * `1.0.168.192.in-addr.arpa.` — the dot is DNS wire-format framing, and
 * every other stringifier in this package emits a bare canonical form
 * without it. Callers handing the name to a resolver that requires an
 * absolute name append `"."` themselves. See ADR 0014.
 *
 * ## Addresses only
 *
 * There is no prefix or zone form. The reverse zone name of a CIDR block is
 * only well defined on a byte (IPv4) or nibble (IPv6) boundary, and the
 * RFC 2317 classless-delegation name is a different construct again; if
 * either is ever wanted it gets its own name. There is no inverse direction
 * either — nothing in this package parses DNS names.
 *
 * @example Look up the PTR record of an address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipToArpa } from "@hertzg/ip/arpa";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(ipToArpa(parseIp("8.8.8.8")), "8.8.8.8.in-addr.arpa");
 * assertEquals(
 *   ipToArpa(parseIp("2001:4860:4860::8888")),
 *   "8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * @module
 */

import type { Address } from "./ip.ts";
import { stringifyIpv4 } from "./ipv4.ts";
import { stringifyIpv6Expanded } from "./ipv6.ts";

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
 * import { ipv4ToArpa } from "@hertzg/ip/arpa";
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
 * import { ipv4ToArpa } from "@hertzg/ip/arpa";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4ToArpa(parseIpv4("8.8.8.8")) + ".", "8.8.8.8.in-addr.arpa.");
 * ```
 */
export function ipv4ToArpa(address: number): string {
  const [first, second, third, fourth] = stringifyIpv4(address).split(".");
  return `${fourth}.${third}.${second}.${first}.in-addr.arpa`;
}

/**
 * Builds the reverse DNS pointer name of an IPv6 address.
 *
 * All 32 nibbles of the expanded address are written in reverse order,
 * one per label, under `ip6.arpa`, as RFC 3596 §2.5 specifies. Nothing is
 * compressed and no leading zero is elided — the name always has 34 labels.
 *
 * The name is **relative** — it carries no trailing dot. Append `"."` if a
 * resolver requires an absolute name.
 *
 * An IPv4-mapped address reaches this function only when the caller holds it
 * as a `bigint`, in which case it gets the `ip6.arpa` name of its 128-bit
 * value. {@link ipToArpa} never sees one, since {@link parseIp} unwraps
 * mapped addresses to IPv4 (see ADR 0004).
 *
 * @param address The address as a 128-bit bigint
 * @returns The `ip6.arpa` name, without a trailing dot
 * @throws {RangeError} If the address is negative or greater than 2^128-1
 *
 * @example Building the name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6ToArpa } from "@hertzg/ip/arpa";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(
 *   ipv6ToArpa(parseIpv6("2001:db8::1")),
 *   "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
 * );
 * assertEquals(
 *   ipv6ToArpa(parseIpv6("::")),
 *   "0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa",
 * );
 * ```
 *
 * @example An IPv4-mapped address held as a bigint keeps its ip6.arpa name
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6ToArpa } from "@hertzg/ip/arpa";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(
 *   ipv6ToArpa(parseIpv6("::ffff:192.168.0.1")),
 *   "1.0.0.0.8.a.0.c.f.f.f.f.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.ip6.arpa",
 * );
 * ```
 */
export function ipv6ToArpa(address: bigint): string {
  const expanded = stringifyIpv6Expanded(address);

  const nibbles: string[] = [];
  for (let i = expanded.length - 1; i >= 0; i--) {
    if (expanded[i] !== ":") {
      nibbles.push(expanded[i]);
    }
  }

  return `${nibbles.join(".")}.ip6.arpa`;
}

/**
 * Builds the reverse DNS pointer name of an IP address of either version.
 *
 * Picks the version from the type of the address — `number` for IPv4,
 * `bigint` for IPv6 — the same `typeof` dispatch {@link stringifyIp} and
 * {@link ipToBytes} use, and delegates to {@link ipv4ToArpa} or
 * {@link ipv6ToArpa}.
 *
 * The name is **relative** — it carries no trailing dot. Append `"."` if a
 * resolver requires an absolute name.
 *
 * An address that came from {@link parseIp} as `::ffff:x.x.x.x` arrives here
 * already unwrapped to IPv4 (ADR 0004), so it gets an `in-addr.arpa` name.
 * Callers wanting the `ip6.arpa` name of a mapped address hold the `bigint`
 * from {@link parseIpv6} and call {@link ipv6ToArpa}.
 *
 * @param address The address, `number` for IPv4 or `bigint` for IPv6
 * @returns The `in-addr.arpa` or `ip6.arpa` name, without a trailing dot
 * @throws {RangeError} If the address is outside the range of its version
 *
 * @example Either version, one call
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipToArpa } from "@hertzg/ip/arpa";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(ipToArpa(parseIp("192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * assertEquals(
 *   ipToArpa(parseIp("2001:db8::1")),
 *   "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * @example An IPv4-mapped address is IPv4 by the time it gets here
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipToArpa } from "@hertzg/ip/arpa";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(ipToArpa(parseIp("::ffff:192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * ```
 */
export function ipToArpa(address: Address): string {
  return typeof address === "bigint"
    ? ipv6ToArpa(address)
    : ipv4ToArpa(address);
}
