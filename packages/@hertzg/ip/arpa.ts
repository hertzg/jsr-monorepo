/**
 * Universal reverse DNS pointer names for IP addresses.
 *
 * This module provides {@link addressToArpa}, which picks the IP version from the
 * shape of its argument and delegates to the version-specific function. The
 * name it builds is where a `PTR` record for the address lives: the four IPv4
 * octets reversed under `in-addr.arpa` (RFC 1035 §3.5), or all 32 IPv6
 * nibbles reversed under `ip6.arpa` (RFC 3596 §2.5).
 *
 * For version-specific functions, see:
 * - [`arpav4`](https://jsr.io/@hertzg/ip/doc/arpav4): {@link addressv4ToArpa}
 * - [`arpav6`](https://jsr.io/@hertzg/ip/doc/arpav6): {@link addressv6ToArpa}
 *
 * ## The names are relative
 *
 * No trailing dot. `1.0.168.192.in-addr.arpa`, not
 * `1.0.168.192.in-addr.arpa.` — the dot is DNS wire-format framing, and
 * every other stringifier in this package emits a bare canonical form
 * without it. Callers handing the name to a resolver that requires an
 * absolute name append `"."` themselves. See ADR 0009.
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
 * import { addressToArpa } from "@hertzg/ip/arpa";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(addressToArpa(parseAddress("8.8.8.8")), "8.8.8.8.in-addr.arpa");
 * assertEquals(
 *   addressToArpa(parseAddress("2001:4860:4860::8888")),
 *   "8.8.8.8.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.6.8.4.0.6.8.4.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * @module
 */

import type { Address } from "./address.ts";
import { addressv4ToArpa } from "./arpav4.ts";
import { addressv6ToArpa } from "./arpav6.ts";

/**
 * Builds the reverse DNS pointer name of an IP address of either version.
 *
 * Picks the version from the type of the address — `number` for IPv4,
 * `bigint` for IPv6 — the same `typeof` dispatch {@link stringifyAddress} and
 * {@link addressToBytes} use, and delegates to {@link addressv4ToArpa} or
 * {@link addressv6ToArpa}.
 *
 * The name is **relative** — it carries no trailing dot. Append `"."` if a
 * resolver requires an absolute name.
 *
 * An address that came from {@link parseAddress} as `::ffff:x.x.x.x` arrives here
 * already unwrapped to IPv4 (ADR 0004), so it gets an `in-addr.arpa` name.
 * Callers wanting the `ip6.arpa` name of a mapped address hold the `bigint`
 * from {@link parseAddressv6} and call {@link addressv6ToArpa}.
 *
 * @param address The address, `number` for IPv4 or `bigint` for IPv6
 * @returns The `in-addr.arpa` or `ip6.arpa` name, without a trailing dot
 * @throws {RangeError} If the address is outside the range of its version
 *
 * @example Either version, one call
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressToArpa } from "@hertzg/ip/arpa";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(addressToArpa(parseAddress("192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * assertEquals(
 *   addressToArpa(parseAddress("2001:db8::1")),
 *   "1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
 * );
 * ```
 *
 * @example An IPv4-mapped address is IPv4 by the time it gets here
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressToArpa } from "@hertzg/ip/arpa";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(addressToArpa(parseAddress("::ffff:192.168.0.1")), "1.0.168.192.in-addr.arpa");
 * ```
 */
export function addressToArpa(address: Address): string {
  return typeof address === "bigint"
    ? addressv6ToArpa(address)
    : addressv4ToArpa(address);
}
