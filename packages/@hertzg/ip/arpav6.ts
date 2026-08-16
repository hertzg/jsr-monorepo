/**
 * IPv6 reverse DNS pointer names.
 *
 * This module provides {@link ipv6ToArpa}, which builds the `ip6.arpa` name a
 * `PTR` record for an IPv6 address lives at (RFC 3596 §2.5).
 *
 * For the IPv4 and universal forms, see:
 * - [`arpav4`](https://jsr.io/@hertzg/ip/doc/arpav4): {@link ipv4ToArpa}
 * - [`arpa`](https://jsr.io/@hertzg/ip/doc/arpa): {@link ipToArpa}
 *
 * The name is relative -- no trailing dot. See ADR 0014.
 *
 * @example Build the name a PTR record lives at
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6ToArpa } from "@hertzg/ip/arpav6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(
 *   ipv6ToArpa(parseIpv6("2001:db8::1")),
 *   "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * @module
 */

import { stringifyIpv6Expanded } from "./ipv6.ts";

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
 * import { ipv6ToArpa } from "@hertzg/ip/arpav6";
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
 * import { ipv6ToArpa } from "@hertzg/ip/arpav6";
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
