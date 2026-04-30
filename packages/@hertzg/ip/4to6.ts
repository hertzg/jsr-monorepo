/**
 * IPv4-mapped IPv6 address and CIDR conversion utilities.
 *
 * This module provides functions to convert between IPv4 addresses and their
 * IPv4-mapped IPv6 representation as defined in
 * {@link https://www.rfc-editor.org/rfc/rfc4291#section-2.5.5.2 | RFC 4291 Section 2.5.5.2}.
 *
 * IPv4-mapped IPv6 addresses have the form `::ffff:x.x.x.x` where the upper
 * 96 bits are the well-known prefix `::ffff:0:0/96` and the lower 32 bits
 * contain the IPv4 address.
 *
 * CIDR conversion adjusts prefix lengths by the 96-bit offset: an IPv4 `/8`
 * becomes an IPv6 `/104` (96 + 8), and vice versa.
 *
 * @example Convert between IPv4 and IPv4-mapped IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4From64Mapped, ipv4To64Mapped } from "@hertzg/ip/4to6";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 * import { parseIpv6, stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const v4 = parseIpv4("192.168.1.1");
 * const mapped = ipv4To64Mapped(v4);
 * assertEquals(stringifyIpv6(mapped), "::ffff:c0a8:101");
 *
 * const back = ipv4From64Mapped(mapped);
 * assertEquals(stringifyIpv4(back), "192.168.1.1");
 * ```
 *
 * @example Convert CIDR blocks between IPv4 and IPv4-mapped IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4FromCidrv64Mapped, cidrv4ToCidrv64Mapped } from "@hertzg/ip/4to6";
 * import { parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const v4cidr = parseCidrv4("10.0.0.0/8");
 * const v6cidr = cidrv4ToCidrv64Mapped(v4cidr);
 * assertEquals(stringifyCidrv6(v6cidr), "::ffff:a00:0/104");
 *
 * const back = cidrv4FromCidrv64Mapped(v6cidr);
 * assertEquals(stringifyCidrv4(back), "10.0.0.0/8");
 * ```
 *
 * @module
 */

import type { Cidrv4 } from "./cidrv4.ts";
import type { Cidrv6 } from "./cidrv6.ts";

/**
 * The well-known prefix for IPv4-mapped IPv6 addresses (`::ffff:0:0/96`).
 *
 * Upper 96 bits: `0x0000_0000_0000_0000_0000_FFFF`, lower 32 bits: IPv4 address.
 */
const IPV4_MAPPED_PREFIX = 0xFFFF_0000_0000n;

/** Mask for extracting the lower 32 bits (IPv4 portion). */
const IPV4_MASK = 0xFFFF_FFFFn;

/**
 * Converts an IPv4 address to its IPv4-mapped IPv6 representation.
 *
 * Embeds the 32-bit IPv4 address into the `::ffff:0:0/96` prefix, producing
 * the 128-bit IPv4-mapped IPv6 address defined in
 * {@link https://www.rfc-editor.org/rfc/rfc4291#section-2.5.5.2 | RFC 4291 Section 2.5.5.2}.
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns The IPv4-mapped IPv6 address as a 128-bit bigint
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4To64Mapped } from "@hertzg/ip/4to6";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(
 *   stringifyIpv6(ipv4To64Mapped(parseIpv4("192.168.1.1"))),
 *   "::ffff:c0a8:101",
 * );
 * assertEquals(
 *   stringifyIpv6(ipv4To64Mapped(parseIpv4("127.0.0.1"))),
 *   "::ffff:7f00:1",
 * );
 * assertEquals(
 *   stringifyIpv6(ipv4To64Mapped(parseIpv4("0.0.0.0"))),
 *   "::ffff:0:0",
 * );
 * ```
 */
export function ipv4To64Mapped(ip: number): bigint {
  return IPV4_MAPPED_PREFIX | BigInt(ip);
}

/**
 * Extracts the IPv4 address from an IPv4-mapped IPv6 address.
 *
 * Takes a 128-bit IPv4-mapped IPv6 address (`::ffff:x.x.x.x`) and returns
 * the embedded 32-bit IPv4 address as defined in
 * {@link https://www.rfc-editor.org/rfc/rfc4291#section-2.5.5.2 | RFC 4291 Section 2.5.5.2}.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns The extracted IPv4 address as a 32-bit unsigned integer
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4From64Mapped } from "@hertzg/ip/4to6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(
 *   stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:192.168.1.1"))),
 *   "192.168.1.1",
 * );
 * assertEquals(
 *   stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:c0a8:101"))),
 *   "192.168.1.1",
 * );
 * assertEquals(
 *   stringifyIpv4(ipv4From64Mapped(parseIpv6("::ffff:0.0.0.0"))),
 *   "0.0.0.0",
 * );
 * ```
 */
export function ipv4From64Mapped(ip: bigint): number {
  return Number(ip & IPV4_MASK);
}

/** The number of prefix bits occupied by the IPv4-mapped prefix (`::ffff:0:0/96`). */
const IPV4_MAPPED_PREFIX_LENGTH = 96;

/**
 * Converts an IPv4 CIDR block to its IPv4-mapped IPv6 CIDR representation.
 *
 * The address is embedded into the `::ffff:0:0/96` prefix and the prefix
 * length is offset by 96: an IPv4 `/8` becomes an IPv6 `/104`.
 *
 * @param cidr The IPv4 CIDR block
 * @returns The equivalent IPv4-mapped IPv6 CIDR block
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4ToCidrv64Mapped } from "@hertzg/ip/4to6";
 * import { parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(
 *   stringifyCidrv6(cidrv4ToCidrv64Mapped(parseCidrv4("10.0.0.0/8"))),
 *   "::ffff:a00:0/104",
 * );
 * assertEquals(
 *   stringifyCidrv6(cidrv4ToCidrv64Mapped(parseCidrv4("192.168.1.0/24"))),
 *   "::ffff:c0a8:100/120",
 * );
 * assertEquals(
 *   stringifyCidrv6(cidrv4ToCidrv64Mapped(parseCidrv4("0.0.0.0/0"))),
 *   "::ffff:0:0/96",
 * );
 * ```
 */
export function cidrv4ToCidrv64Mapped(cidr: Cidrv4): Cidrv6 {
  return {
    address: ipv4To64Mapped(cidr.address),
    prefixLength: cidr.prefixLength + IPV4_MAPPED_PREFIX_LENGTH,
  };
}

/**
 * Converts an IPv4-mapped IPv6 CIDR block to its IPv4 CIDR representation.
 *
 * The IPv4 address is extracted from the `::ffff:0:0/96` prefix and the
 * prefix length is reduced by 96: an IPv6 `/104` becomes an IPv4 `/8`.
 *
 * @param cidr The IPv6 CIDR block (must have prefix length >= 96)
 * @returns The equivalent IPv4 CIDR block
 * @throws {RangeError} If prefix length is less than 96
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4FromCidrv64Mapped } from "@hertzg/ip/4to6";
 * import { parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(
 *   stringifyCidrv4(cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:10.0.0.0/104"))),
 *   "10.0.0.0/8",
 * );
 * assertEquals(
 *   stringifyCidrv4(cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:192.168.1.0/120"))),
 *   "192.168.1.0/24",
 * );
 * assertEquals(
 *   stringifyCidrv4(cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:0.0.0.0/96"))),
 *   "0.0.0.0/0",
 * );
 * ```
 *
 * @example Throws for prefix length less than 96
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4FromCidrv64Mapped } from "@hertzg/ip/4to6";
 * import { parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidrv4FromCidrv64Mapped(parseCidrv6("::ffff:0:0/64")), RangeError);
 * assertThrows(() => cidrv4FromCidrv64Mapped(parseCidrv6("2001:db8::/32")), RangeError);
 * ```
 */
export function cidrv4FromCidrv64Mapped(cidr: Cidrv6): Cidrv4 {
  if (cidr.prefixLength < IPV4_MAPPED_PREFIX_LENGTH) {
    throw new RangeError(
      `Prefix length ${cidr.prefixLength} is less than ${IPV4_MAPPED_PREFIX_LENGTH}`,
    );
  }
  return {
    address: ipv4From64Mapped(cidr.address),
    prefixLength: cidr.prefixLength - IPV4_MAPPED_PREFIX_LENGTH,
  };
}
