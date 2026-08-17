/**
 * IPv6 CIDR notation parsing and utilities.
 *
 * This module provides CIDR parsing, network calculations, and IP range
 * checking for IPv6 networks. Works with bigint representations to enable
 * efficient IP assignment workflows.
 *
 * @example CIDR operations
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import {
 *   cidrv6Contains,
 *   cidrv6FirstAddress,
 *   cidrv6LastAddress,
 *   parseCidrv6,
 * } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("2001:db8:ffff:ffff:ffff:ffff::/120");
 * let currentIp = cidrv6FirstAddress(cidr) + 1n;
 *
 * while (cidrv6Contains(cidr, currentIp)) {
 *   const assigned = stringifyAddressv6(currentIp);
 *   currentIp = currentIp + 1n;
 *   if (currentIp > cidrv6LastAddress(cidr)) break;
 * }
 *
 * assert(cidrv6Contains(cidr, parseAddressv6("2001:db8:ffff:ffff:ffff:ffff::1")));
 * assertEquals(cidrv6Contains(cidr, parseAddressv6("2001:db9::1")), false);
 * ```
 *
 * @module
 */

import {
  compareAddressv6,
  mapFromAddressv4,
  parseAddressv6,
  stringifyAddressv6,
  unmapToAddressv4,
} from "./addressv6.ts";
import type { Cidrv4 } from "./cidrv4.ts";

/**
 * Represents an IPv6 CIDR block.
 *
 * Contains only the parsed values from the CIDR notation.
 */
export type Cidrv6 = {
  /** The IPv6 address from the CIDR notation */
  readonly address: bigint;
  /** The prefix length (0-128) */
  readonly prefixLength: number;
};

/**
 * Every IPv6 network mask, indexed by prefix length.
 *
 * Hoisted to module scope rather than built per call: each entry is an
 * immutable `bigint`, and producing one costs a 128-bit shift plus the
 * allocations that come with bigint arithmetic. `cidrv6Contains`,
 * `cidrv6FirstAddress` and `cidrv6LastAddress` all route through
 * {@link cidrv6Mask}, so a CIDR list scanned per request would otherwise
 * repeat that work for every entry. The domain is 129 values known at
 * author time, which is what makes a plain array the right cache — see
 * ADR 0007 for the same reasoning applied to the classifier ranges.
 *
 * Deliberately left extensible. Making an array non-extensible moves it out
 * of `PACKED_ELEMENTS` into the sealed/frozen elements kinds, which are not
 * on V8's fast path for keyed loads: 4.33ns per lookup versus 0.92ns packed,
 * slower even than a `Map` at 3.10ns. `Object.seal` and
 * `Object.preventExtensions` measure the same as `Object.freeze` here -- the
 * cost is the non-extensibility, not the immutability -- so none of the three
 * is a way out. The `readonly` type prevents mutation where it matters.
 */
const MASKS_V6: readonly bigint[] = Array.from(
  { length: 129 },
  (_, prefixLength) =>
    prefixLength === 0
      ? 0n
      : (0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn << BigInt(128 - prefixLength)) &
        0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn,
);

/**
 * Every IPv6 CIDR block size, indexed by prefix length.
 *
 * Hoisted for the same reason as {@link MASKS_V6}: `2n ** BigInt(128 - n)`
 * over a domain of 129 known values.
 */
const SIZES_V6: readonly bigint[] = Array.from(
  { length: 129 },
  (_, prefixLength) => 2n ** BigInt(128 - prefixLength),
);

/**
 * Creates a network mask from an IPv6 prefix length.
 *
 * The prefix length must be between 0 and 128 (inclusive).
 *
 * @param prefixLength The CIDR prefix length (0-128)
 * @returns The network mask as a bigint
 * @throws {RangeError} If the prefix length is out of range
 *
 * @example Creating masks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Mask } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Mask(128), 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn);
 * assertEquals(cidrv6Mask(64), 0xFFFFFFFFFFFFFFFF0000000000000000n);
 * assertEquals(cidrv6Mask(48), 0xFFFFFFFFFFFF00000000000000000000n);
 * assertEquals(cidrv6Mask(32), 0xFFFFFFFF000000000000000000000000n);
 * assertEquals(cidrv6Mask(0), 0n);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6Mask } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidrv6Mask(-1), RangeError);
 * assertThrows(() => cidrv6Mask(129), RangeError);
 * ```
 */
export function cidrv6Mask(prefixLength: number): bigint {
  // The table is the range check: anything that is not an index into it --
  // out of range, fractional, NaN, Infinity -- misses and yields undefined.
  const mask = MASKS_V6[prefixLength];
  if (mask === undefined) {
    throw new RangeError(
      `CIDR prefix length must be 0-128, got ${prefixLength}`,
    );
  }

  return mask;
}

/**
 * Recovers the prefix length from an IPv6 network mask given as a bigint.
 *
 * @param mask The network mask as a bigint
 * @returns The prefix length (0-128)
 * @throws {TypeError} If the mask's one bits are not contiguous from the top
 * @throws {RangeError} If the mask is not in 0n to 2^128 - 1
 *
 * @example Recovering prefix lengths from bigints
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6PrefixLength(0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn), 128);
 * assertEquals(cidrv6PrefixLength(0xFFFFFFFFFFFFFFFF0000000000000000n), 64);
 * assertEquals(cidrv6PrefixLength(0xFFFFFFFFFFFF00000000000000000000n), 48);
 * assertEquals(cidrv6PrefixLength(0xFFFFFFFF000000000000000000000000n), 32);
 * assertEquals(cidrv6PrefixLength(0n), 0);
 * ```
 */
export function cidrv6PrefixLength(mask: bigint): number;
/**
 * Recovers the prefix length from an IPv6 network mask given in
 * colon-hexadecimal notation.
 *
 * The string is parsed with the same rules as {@link parseAddressv6} and then
 * interpreted as a mask rather than an address.
 *
 * Note that IPv6 has no standard netmask notation. RFC 4291 section 2.3
 * defines exactly one way to write a prefix -- `address/prefix-length` --
 * and nothing equivalent to IPv4's dotted netmask. A string like
 * `"ffff:ffff:ffff:ffff::"` is a well-formed IPv6 *address* literal whose
 * 128 bits are being read as a mask. It is accepted here because system
 * APIs do report masks that way: POSIX `getifaddrs()` fills `ifa_netmask`
 * with a `sockaddr_in6`, which is what `Deno.networkInterfaces()` surfaces
 * as `netmask: "ffff:ffff:ffff:ffff::"`. Prefer the prefix length when a
 * source offers one -- those same APIs usually also report `cidr`.
 *
 * @param mask The network mask in colon-hexadecimal notation (e.g. "ffff:ffff::")
 * @returns The prefix length (0-128)
 * @throws {TypeError} If the notation is malformed (bad group, wrong group
 *   count), or the mask's one bits are not contiguous from the top
 * @throws {RangeError} If an embedded IPv4 octet is out of range, as in
 *   `"::1.2.3.256"` -- a malformed hex group is a `TypeError`, not this
 *
 * @example Recovering prefix lengths from colon-hexadecimal
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6PrefixLength("ffff:ffff:ffff:ffff::"), 64);
 * assertEquals(cidrv6PrefixLength("ffff:ffff::"), 32);
 * assertEquals(cidrv6PrefixLength("::"), 0);
 * ```
 */
export function cidrv6PrefixLength(mask: string): number;
/**
 * Recovers the prefix length from an IPv6 network mask.
 *
 * The inverse of {@link cidrv6Mask}. Accepts either a bigint or
 * colon-hexadecimal notation.
 *
 * A CIDR mask is a run of one bits from the most significant end followed
 * by zeros; masks that do not have that shape describe no prefix length at
 * all and are rejected rather than answered with a plausible-looking count
 * of set bits.
 *
 * @param mask The network mask, as a bigint or colon-hexadecimal notation
 * @returns The prefix length (0-128)
 * @throws {TypeError} If the mask is not contiguous, or the notation is malformed
 * @throws {RangeError} If the mask is out of range
 *
 * @example Both forms agree
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6PrefixLength("ffff:ffff:ffff:ffff::"), 64);
 * assertEquals(cidrv6PrefixLength(0xFFFFFFFFFFFFFFFF0000000000000000n), 64);
 * ```
 *
 * @example Non-contiguous masks throw, in either form
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidrv6PrefixLength(0xFFFF0000FFFF00000000000000000000n), TypeError);
 * assertThrows(() => cidrv6PrefixLength("ffff:0:ffff::"), TypeError);
 * assertThrows(() => cidrv6PrefixLength("::ffff:ffff"), TypeError);
 * ```
 *
 * @example Round-trips with cidrv6Mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Mask, cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * for (let prefixLength = 0; prefixLength <= 128; prefixLength++) {
 *   assertEquals(cidrv6PrefixLength(cidrv6Mask(prefixLength)), prefixLength);
 * }
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * // Wrong shape -- in range, but not a mask
 * assertThrows(() => cidrv6PrefixLength(0xFFFF0000FFFF00000000000000000000n), TypeError);
 * assertThrows(() => cidrv6PrefixLength("ffff:0:ffff::"), TypeError);
 *
 * // Malformed notation
 * assertThrows(() => cidrv6PrefixLength("gggg::"), TypeError);
 *
 * // Wrong range -- not a 128-bit unsigned integer at all
 * assertThrows(() => cidrv6PrefixLength(-1n), RangeError);
 * assertThrows(() => cidrv6PrefixLength(1n << 128n), RangeError);
 * ```
 */
export function cidrv6PrefixLength(mask: string | bigint): number;
/** Recovers the prefix length from an IPv6 network mask. */
export function cidrv6PrefixLength(mask: string | bigint): number {
  const value = typeof mask === "string" ? parseAddressv6(mask) : mask;

  if (value < 0n || value > 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) {
    throw new RangeError(
      `IPv6 mask must be a 128-bit unsigned integer, got ${value}`,
    );
  }

  // The complement of a contiguous mask is a run of trailing ones, i.e.
  // 2^hostBitCount - 1. Only those values satisfy `n & (n + 1) === 0`.
  const hostBits = ~value & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;
  if ((hostBits & (hostBits + 1n)) !== 0n) {
    throw new TypeError(
      `IPv6 mask is not contiguous: 0x${value.toString(16).padStart(32, "0")}`,
    );
  }

  // hostBits + 1n is therefore an exact power of two, whose binary
  // length is the host bit count plus one.
  const hostBitCount = (hostBits + 1n).toString(2).length - 1;
  return 128 - hostBitCount;
}

/** Character codes the prefix-length scanner compares against. */
const CHAR_ZERO = 0x30;
const CHAR_NINE = 0x39;

/**
 * Reads a prefix length: decimal digits with no leading zero.
 *
 * `-` is not a digit, so a signed prefix length is a shape error here rather
 * than a range error from `cidrv6Mask`. That keeps the sign out of the
 * returned value, which is what let `"/-0"` through: `-0` is numerically `0`,
 * so it passes any range check and reaches the caller as a `Cidrv6` holding a
 * negative zero.
 */
function parsePrefixLength(part: string): number {
  if (part.length === 0) {
    throw new TypeError("CIDR prefix length must be a number, got ''");
  }

  if (part.length > 1 && part.charCodeAt(0) === CHAR_ZERO) {
    throw new TypeError(
      `CIDR prefix length cannot have leading zeros, got '${part}'`,
    );
  }

  let prefixLength = 0;
  for (let index = 0; index < part.length; index++) {
    const code = part.charCodeAt(index);
    if (code < CHAR_ZERO || code > CHAR_NINE) {
      throw new TypeError(`CIDR prefix length must be a number, got '${part}'`);
    }
    prefixLength = prefixLength * 10 + (code - CHAR_ZERO);
  }

  return prefixLength;
}

/**
 * Parses an IPv6 CIDR notation string to a Cidrv6 object.
 *
 * Returns only the parsed values (address and prefix length).
 *
 * The prefix length is decimal digits and nothing else: no leading zeros, no
 * whitespace, no sign, and no trailing text.
 *
 * @param cidr The CIDR notation string (e.g., "2001:db8::/32")
 * @returns A Cidrv6 object containing the parsed address and prefix length
 * @throws {TypeError} If the format is invalid, including a prefix length
 *   with leading zeros, whitespace or trailing text
 * @throws {RangeError} If the prefix length is out of range (not 0-128)
 * @throws Propagates errors from parseAddressv6 if the address part is invalid
 *
 * @example Basic CIDR parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(cidr.address, 42540766411282592856903984951653826560n);
 * assertEquals(cidr.prefixLength, 32);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => parseCidrv6("2001:db8::"), TypeError);
 * assertThrows(() => parseCidrv6("2001:db8::/"), TypeError);
 * assertThrows(() => parseCidrv6("2001:db8::/129"), RangeError);
 * assertThrows(() => parseCidrv6("2001:db8::/032"), TypeError);
 * ```
 */
export function parseCidrv6(cidr: string): Cidrv6 {
  const slashIndex = cidr.lastIndexOf("/");

  if (slashIndex === -1) {
    throw new TypeError(
      `CIDR notation must be in format '<address>/<prefix>'`,
    );
  }

  const addressPart = cidr.slice(0, slashIndex);
  const prefixPart = cidr.slice(slashIndex + 1);

  if (prefixPart === "") {
    throw new TypeError("CIDR prefix length must be specified");
  }

  const address = parseAddressv6(addressPart);
  const prefixLength = parsePrefixLength(prefixPart);

  // Validate prefix length
  cidrv6Mask(prefixLength);

  return {
    address,
    prefixLength,
  };
}

/**
 * Stringifies a Cidrv6 object to CIDR notation.
 *
 * @param cidr The Cidrv6 object to stringify
 * @returns The CIDR notation string (e.g., "2001:db8::/32")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(stringifyCidrv6(cidr), "2001:db8::/32");
 * ```
 */
export function stringifyCidrv6(cidr: Cidrv6): string {
  return `${stringifyAddressv6(cidr.address)}/${cidr.prefixLength}`;
}

/**
 * Checks if an IPv6 address is contained within a CIDR block.
 *
 * @param cidr The CIDR block to check against
 * @param address The address to check, as a 128-bit bigint
 * @returns true if the address is within the CIDR block, false otherwise
 *
 * @example Basic contains check
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv6Contains, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 *
 * assert(cidrv6Contains(cidr, parseAddressv6("2001:db8::")));
 * assert(cidrv6Contains(cidr, parseAddressv6("2001:db8::1")));
 * assert(cidrv6Contains(cidr, parseAddressv6("2001:db8:ffff:ffff:ffff:ffff:ffff:ffff")));
 * assertEquals(cidrv6Contains(cidr, parseAddressv6("2001:db9::1")), false);
 * assertEquals(cidrv6Contains(cidr, parseAddressv6("2001:db7:ffff:ffff:ffff:ffff:ffff:ffff")), false);
 * ```
 *
 * @example IP assignment workflow
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidrv6Contains,
 *   cidrv6FirstAddress,
 *   cidrv6LastAddress,
 *   parseCidrv6,
 * } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("fd00::/120"); // 256 IPs
 * let currentIp = cidrv6FirstAddress(cidr) + 1n;
 *
 * const assigned: bigint[] = [];
 * while (currentIp < cidrv6LastAddress(cidr)) {
 *   assert(cidrv6Contains(cidr, currentIp));
 *   assigned.push(currentIp);
 *   currentIp = currentIp + 1n;
 * }
 * ```
 */
export function cidrv6Contains(cidr: Cidrv6, address: bigint): boolean {
  const mask = cidrv6Mask(cidr.prefixLength);
  const network = cidr.address & mask;
  return (address & mask) === network;
}

/**
 * Returns the first address of a CIDR block.
 *
 * IPv6 has no equivalent of the IPv4 network address, so unlike
 * `cidrv4FirstAddress` this is normally assignable to an interface. The one
 * caveat is per-link rather than universal: RFC 4291 section 2.6.1 reserves
 * the all-zeros interface identifier as the Subnet-Router anycast address,
 * while RFC 6164 assigns both addresses of a `/127` inter-router link.
 *
 * Because that reservation depends on the link, there is deliberately no
 * `cidrv6FirstUsableAddress` to pair with
 * {@link https://jsr.io/@hertzg/ip/doc/cidrv4/~/cidrv4FirstUsableAddress | cidrv4FirstUsableAddress}.
 * Callers whose link does reserve the anycast skip it themselves — see the
 * second example.
 *
 * @param cidr The CIDR block
 * @returns The first address as a bigint
 *
 * @example Getting first address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6FirstAddress, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(cidrv6FirstAddress(cidr), parseAddressv6("2001:db8::"));
 * ```
 *
 * @example Skipping the Subnet-Router anycast on a link that reserves it
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("2001:db8::/126");
 * const assignable = Array.from(cidrv6Addresses(cidr, { offset: 1n }));
 * assertEquals(assignable.map(stringifyAddressv6), [
 *   "2001:db8::1",
 *   "2001:db8::2",
 *   "2001:db8::3",
 * ]);
 * ```
 */
export function cidrv6FirstAddress(cidr: Cidrv6): bigint {
  const mask = cidrv6Mask(cidr.prefixLength);
  return cidr.address & mask;
}

/**
 * Returns the last address of a CIDR block.
 *
 * IPv6 has no broadcast address, so nothing is reserved at the top of a
 * block and this address is assignable. That is why there is deliberately
 * no `cidrv6BroadcastAddress` and no `cidrv6LastUsableAddress` to pair with
 * their IPv4 counterparts — the asymmetry is a fact about IPv6, not a gap.
 *
 * @param cidr The CIDR block
 * @returns The last address as a bigint
 *
 * @example Getting last address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6LastAddress, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("2001:db8::/120");
 * assertEquals(cidrv6LastAddress(cidr), parseAddressv6("2001:db8::ff"));
 * ```
 */
export function cidrv6LastAddress(cidr: Cidrv6): bigint {
  const mask = cidrv6Mask(cidr.prefixLength);
  const network = cidr.address & mask;
  return network | (~mask & 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn);
}

/**
 * Returns the total number of IP addresses in a CIDR block.
 *
 * For a /120 network, this returns 256n. For a /128, this returns 1n.
 * The result is a bigint because IPv6 blocks can hold up to 2^128 addresses.
 *
 * @param cidr The CIDR block
 * @returns The total number of addresses in the CIDR block as a bigint
 *
 * @example Getting CIDR size from Cidrv6 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Size, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Size(parseCidrv6("fd00::/120")), 256n);
 * assertEquals(cidrv6Size(parseCidrv6("2001:db8::/32")), 79228162514264337593543950336n);
 * assertEquals(cidrv6Size(parseCidrv6("::1/128")), 1n);
 * assertEquals(cidrv6Size(parseCidrv6("::/64")), 18446744073709551616n);
 * ```
 */
export function cidrv6Size(cidr: Cidrv6): bigint;
/**
 * Returns the total number of IP addresses for a given prefix length.
 *
 * @param prefixLength The CIDR prefix length (0-128)
 * @returns The total number of addresses as a bigint
 * @throws {RangeError} If the prefix length is out of range (not 0-128)
 *
 * @example Getting CIDR size from prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Size } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Size(120), 256n);
 * assertEquals(cidrv6Size(128), 1n);
 * assertEquals(cidrv6Size(64), 18446744073709551616n);
 * ```
 *
 * @example Out-of-range prefix length throws
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6Size } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => cidrv6Size(-1), RangeError);
 * assertThrows(() => cidrv6Size(129), RangeError);
 * ```
 */
export function cidrv6Size(prefixLength: number): bigint;
/**
 * Returns the total number of IP addresses for either a CIDR block or a prefix length.
 *
 * @param cidrOrPrefixLength A Cidrv6 block or a prefix length (0-128)
 * @returns The total number of addresses as a bigint
 */
export function cidrv6Size(cidrOrPrefixLength: Cidrv6 | number): bigint;
/** Returns the total number of IP addresses for either a CIDR block or a prefix length. */
export function cidrv6Size(cidrOrPrefixLength: Cidrv6 | number): bigint {
  const prefixLength = typeof cidrOrPrefixLength === "number"
    ? cidrOrPrefixLength
    : cidrOrPrefixLength.prefixLength;

  // As in cidrv6Mask, the table doubles as the range check.
  const size = SIZES_V6[prefixLength];
  if (size === undefined) {
    throw new RangeError(
      `CIDR prefix length must be 0-128, got ${prefixLength}`,
    );
  }

  return size;
}

/**
 * Checks if one IPv6 CIDR block fully contains another.
 *
 * Returns true when every address in `inner` is also in `outer`.
 * This is the case when `outer` has a shorter-or-equal prefix and
 * both network addresses agree under the outer mask.
 *
 * @param outer The CIDR block that may contain the other
 * @param inner The CIDR block that may be contained
 * @returns true if every address in `inner` is within `outer`
 *
 * @example Outer block contains inner block
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv6ContainsCidr, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assert(cidrv6ContainsCidr(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8:1::/48")));
 * assert(cidrv6ContainsCidr(parseCidrv6("fd00::/8"), parseCidrv6("fd00::/120")));
 * assertEquals(cidrv6ContainsCidr(parseCidrv6("2001:db8:1::/48"), parseCidrv6("2001:db8::/32")), false);
 * ```
 *
 * @example Equal CIDRs contain each other
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv6ContainsCidr, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/64");
 * assert(cidrv6ContainsCidr(cidr, cidr));
 * ```
 *
 * @example /0 contains everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv6ContainsCidr, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const all = parseCidrv6("::/0");
 * assert(cidrv6ContainsCidr(all, parseCidrv6("2001:db8::/32")));
 * assert(cidrv6ContainsCidr(all, parseCidrv6("::1/128")));
 * ```
 */
export function cidrv6ContainsCidr(outer: Cidrv6, inner: Cidrv6): boolean {
  if (outer.prefixLength > inner.prefixLength) return false;
  const outerMask = cidrv6Mask(outer.prefixLength);
  return (outer.address & outerMask) === (inner.address & outerMask);
}

/**
 * Checks if two IPv6 CIDR blocks overlap (share at least one address).
 *
 * Two CIDRs overlap when one contains at least one address of the other.
 * This is equivalent to checking containment using the shorter prefix.
 * The check is symmetric: `cidrv6Overlaps(a, b) === cidrv6Overlaps(b, a)`.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if the two CIDR blocks share at least one address
 *
 * @example Overlapping CIDRs
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv6Overlaps, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assert(cidrv6Overlaps(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8:1::/48")));
 * assert(cidrv6Overlaps(parseCidrv6("2001:db8:1::/48"), parseCidrv6("2001:db8::/32")));
 * assert(cidrv6Overlaps(parseCidrv6("fd00::/120"), parseCidrv6("fd00::/120")));
 * assertEquals(cidrv6Overlaps(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db9::/32")), false);
 * ```
 *
 * @example /0 overlaps everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv6Overlaps, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const all = parseCidrv6("::/0");
 * assert(cidrv6Overlaps(all, parseCidrv6("2001:db8::/32")));
 * assert(cidrv6Overlaps(all, parseCidrv6("::1/128")));
 * ```
 *
 * @example Adjacent but non-overlapping
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Overlaps, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Overlaps(parseCidrv6("2001:db8::/33"), parseCidrv6("2001:db8:8000::/33")), false);
 * ```
 */
export function cidrv6Overlaps(a: Cidrv6, b: Cidrv6): boolean {
  const minPrefix = Math.min(a.prefixLength, b.prefixLength);
  const mask = cidrv6Mask(minPrefix);
  return (a.address & mask) === (b.address & mask);
}

/**
 * Splits an IPv6 CIDR block into its two half-sized children at prefix+1.
 *
 * @param cidr The CIDR block to split
 * @returns A tuple of the lower and upper halves
 */
function cidrv6SplitHalves(cidr: Cidrv6): [Cidrv6, Cidrv6] {
  const newPrefix = cidr.prefixLength + 1;
  const network = cidrv6FirstAddress(cidr);
  const lower: Cidrv6 = { address: network, prefixLength: newPrefix };
  const upper: Cidrv6 = {
    address: network | (1n << BigInt(127 - cidr.prefixLength)),
    prefixLength: newPrefix,
  };
  return [lower, upper];
}

/**
 * Returns the intersection of two IPv6 CIDR blocks.
 *
 * Since CIDR blocks are power-of-2-aligned, two overlapping blocks always
 * have a containment relationship -- the intersection is the more specific
 * (longer prefix) block with its canonical network address.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns The overlapping CIDR with canonical network address, or null if disjoint
 *
 * @example Find overlap between allocations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Intersect, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Intersect(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db8::/48"),
 * );
 * assertEquals(result && stringifyCidrv6(result), "2001:db8::/48");
 * ```
 *
 * @example No overlap returns null
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Intersect, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6Intersect(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db9::/32"),
 * ), null);
 * ```
 */
export function cidrv6Intersect(a: Cidrv6, b: Cidrv6): Cidrv6 | null {
  if (!cidrv6Overlaps(a, b)) return null;
  if (a.prefixLength >= b.prefixLength) {
    return { address: cidrv6FirstAddress(a), prefixLength: a.prefixLength };
  }
  return { address: cidrv6FirstAddress(b), prefixLength: b.prefixLength };
}

/**
 * Subtracts one IPv6 CIDR block from another.
 *
 * Returns the minimal set of CIDR blocks representing all IP addresses
 * in `a` but not in `b`. The algorithm recursively splits `a` into two
 * halves at prefix+1, keeping the non-overlapping half and recursing
 * into the overlapping half.
 *
 * @param a The CIDR block to subtract from
 * @param b The CIDR block to subtract
 * @returns Array of CIDR blocks covering a minus b
 *
 * @example Carve a /48 from a /32
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db8::/48"),
 * );
 * assertEquals(result.length, 16);
 * assertEquals(stringifyCidrv6(result[0]), "2001:db8:8000::/33");
 * ```
 *
 * @example No overlap -- original returned unchanged
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db9::/32"),
 * );
 * assertEquals(result.map(stringifyCidrv6), ["2001:db8::/32"]);
 * ```
 *
 * @example Full containment -- empty result
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/48"),
 *   parseCidrv6("2001:db8::/32"),
 * );
 * assertEquals(result, []);
 * ```
 */
export function cidrv6Subtract(a: Cidrv6, b: Cidrv6): Cidrv6[] {
  if (!cidrv6Overlaps(a, b)) return [a];
  if (cidrv6ContainsCidr(b, a)) return [];
  const [lower, upper] = cidrv6SplitHalves(a);
  return [...cidrv6Subtract(upper, b), ...cidrv6Subtract(lower, b)];
}

/**
 * Generates a range of IP addresses from a CIDR block.
 *
 * Yields IP addresses starting at the specified offset from the
 * network address. The offset is relative to the network address (offset 0 = network address).
 * The step parameter controls the increment (positive or negative) between consecutive addresses.
 * Only addresses within the CIDR block are yielded.
 *
 * By default (when count is not specified), iterates through all addresses in the CIDR block
 * from the offset to the boundary (last address for positive step, network for negative step).
 *
 * IPv6 blocks can be enormous. A /64 has 2^64 addresses. Use `count` or iterate lazily
 * to avoid memory issues.
 *
 * @param cidr The CIDR block to generate addresses from
 * @param options Optional configuration for address generation
 * @param options.offset The offset from the network address (0-based, defaults to 0 for network address)
 * @param options.count The maximum number of addresses to generate (defaults to undefined = iterate until CIDR boundary)
 * @param options.step The increment between addresses (positive or negative, defaults to 1)
 * @returns A generator yielding IP addresses as bigints (may yield less than count if CIDR boundary is reached)
 *
 * @example Default behavior - iterate from offset 0
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("fd00::/120"); // 256 IPs: ::0 to ::ff
 *
 * // Get first 5 IPs (offset=0 by default, starts at network address)
 * const first5 = Array.from(cidrv6Addresses(cidr, { count: 5 }));
 * assertEquals(first5.map(stringifyAddressv6), [
 *   "fd00::", "fd00::1", "fd00::2", "fd00::3", "fd00::4",
 * ]);
 * ```
 *
 * @example Limiting with count parameter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("fd00::/120");
 *
 * // Get first 3 IPs starting at network address
 * const first3 = Array.from(cidrv6Addresses(cidr, { offset: 0, count: 3 }));
 * assertEquals(first3, [
 *   parseAddressv6("fd00::0"),
 *   parseAddressv6("fd00::1"),
 *   parseAddressv6("fd00::2"),
 * ]);
 * ```
 *
 * @example Custom step for even IPs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("fd00::/120");
 *
 * // Get every other IP (even addresses)
 * const evenIps = Array.from(cidrv6Addresses(cidr, { offset: 0, count: 5, step: 2 }));
 * assertEquals(evenIps, [
 *   parseAddressv6("fd00::0"),
 *   parseAddressv6("fd00::2"),
 *   parseAddressv6("fd00::4"),
 *   parseAddressv6("fd00::6"),
 *   parseAddressv6("fd00::8"),
 * ]);
 * ```
 *
 * @example Negative step for reverse iteration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const cidr = parseCidrv6("fd00::/120");
 *
 * // Get 5 IPs counting backwards from offset 10
 * const backwards = Array.from(cidrv6Addresses(cidr, { offset: 10, count: 5, step: -1 }));
 * assertEquals(backwards, [
 *   parseAddressv6("fd00::a"),
 *   parseAddressv6("fd00::9"),
 *   parseAddressv6("fd00::8"),
 *   parseAddressv6("fd00::7"),
 *   parseAddressv6("fd00::6"),
 * ]);
 * ```
 *
 * @example CIDR boundary handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Addresses, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("fd00::/125"); // Only 8 IPs: ::0 to ::7
 *
 * // Requesting more IPs than available stops at CIDR boundary
 * const ips = Array.from(cidrv6Addresses(cidr, { offset: 5, count: 10, step: 1 }));
 * assertEquals(ips.length, 3); // Only ::5, ::6, ::7 are in range
 *
 * // Negative step stops at CIDR start
 * const reverseIps = Array.from(cidrv6Addresses(cidr, { offset: 3, count: 10, step: -1 }));
 * assertEquals(reverseIps.length, 4); // ::3, ::2, ::1, ::0
 * ```
 */
export function* cidrv6Addresses(
  cidr: Cidrv6,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<bigint> {
  const network = cidrv6FirstAddress(cidr);
  const offset = options?.offset ?? 0;
  const count = options?.count;
  const step = options?.step ?? 1;

  let currentIp = network + BigInt(offset);
  const stepSize = BigInt(step);
  const maxCount = count !== undefined ? Number(count) : Infinity;

  let i = 0;
  while (i < maxCount && cidrv6Contains(cidr, currentIp)) {
    yield currentIp;
    currentIp += stepSize;
    i++;
  }
}

/**
 * Checks if two IPv6 CIDR blocks are sibling halves of the same parent block.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if a and b are siblings
 */
function cidrv6AreSiblings(a: Cidrv6, b: Cidrv6): boolean {
  if (a.prefixLength !== b.prefixLength || a.prefixLength === 0) return false;
  const parentMask = cidrv6Mask(a.prefixLength - 1);
  return (a.address & parentMask) === (b.address & parentMask);
}

/**
 * Merges IPv6 CIDR blocks into the minimal covering set.
 *
 * Takes an array of possibly overlapping, adjacent, or redundant CIDR
 * blocks and returns the minimal set of non-overlapping CIDR prefix
 * blocks covering the exact same address space.
 *
 * @param cidrs The CIDR blocks to merge
 * @returns Minimal set of non-overlapping CIDR blocks, sorted by address
 *
 * @example Compact adjacent allocations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Merge, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const blocks = [
 *   parseCidrv6("2001:db8::/33"),
 *   parseCidrv6("2001:db8:8000::/33"),
 * ];
 * assertEquals(cidrv6Merge(blocks).map(stringifyCidrv6), ["2001:db8::/32"]);
 * ```
 *
 * @example Remove contained and merge siblings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Merge, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const blocks = [
 *   parseCidrv6("2001:db8::/32"),
 *   parseCidrv6("2001:db8:1::/48"),
 * ];
 * assertEquals(cidrv6Merge(blocks).map(stringifyCidrv6), ["2001:db8::/32"]);
 * ```
 */
export function cidrv6Merge(cidrs: readonly Cidrv6[]): Cidrv6[] {
  if (cidrs.length === 0) return [];

  // Step 1: Normalize - apply mask to get canonical network addresses
  let list: Cidrv6[] = cidrs.map((cidr) => ({
    address: cidrv6FirstAddress(cidr),
    prefixLength: cidr.prefixLength,
  }));

  // Step 2: Sort so supernets precede their subnets
  list.sort(compareCidrv6);

  // Step 3: Remove contained blocks
  const deduped: Cidrv6[] = [];
  let currentLast = -1n;
  for (const cidr of list) {
    const last = cidrv6LastAddress(cidr);
    if (last <= currentLast) continue;
    deduped.push(cidr);
    currentLast = last;
  }
  list = deduped;

  // Step 4: Merge adjacent siblings iteratively until stable
  let changed = true;
  while (changed) {
    changed = false;
    const merged: Cidrv6[] = [];
    let i = 0;
    while (i < list.length) {
      if (
        i + 1 < list.length && cidrv6AreSiblings(list[i], list[i + 1])
      ) {
        merged.push({
          address: list[i].address,
          prefixLength: list[i].prefixLength - 1,
        });
        i += 2;
        changed = true;
      } else {
        merged.push(list[i]);
        i += 1;
      }
    }
    list = merged;
  }

  return list;
}

/**
 * Compares two IPv6 CIDR blocks for sorting.
 *
 * Orders by address ascending, then by prefix length ascending — so where
 * two blocks share a start address, the shorter prefix (the larger block,
 * the supernet) sorts first. This is the order PostgreSQL's `cidr` type
 * uses, and the order every containing block needs to precede the blocks
 * it contains, which is what {@link cidrv6Merge} relies on internally.
 *
 * The block is ordered **as written**: the `address` field is compared as
 * stored, without applying the network mask first. A block carrying host
 * bits therefore sorts by the address {@link stringifyCidrv6} will print
 * for it, and `2001:db8::5/64` does not compare equal to `2001:db8::/64`
 * even though they cover the same addresses. Normalize with
 * {@link cidrv6FirstAddress} first if that is the order you want.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort a list of allocations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidrv6, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const blocks = ["2001:db8:1::/48", "2001:db8::/48", "2001:db8::/32"].map(parseCidrv6);
 *
 * assertEquals(blocks.toSorted(compareCidrv6).map(stringifyCidrv6), [
 *   "2001:db8::/32",
 *   "2001:db8::/48",
 *   "2001:db8:1::/48",
 * ]);
 * ```
 *
 * @example A supernet sorts before its subnets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidrv6, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(compareCidrv6(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8::/48")), -1);
 * assertEquals(compareCidrv6(parseCidrv6("2001:db8::/48"), parseCidrv6("2001:db8::/32")), 1);
 * assertEquals(compareCidrv6(parseCidrv6("2001:db8::/32"), parseCidrv6("2001:db8::/32")), 0);
 * ```
 */
export function compareCidrv6(a: Cidrv6, b: Cidrv6): -1 | 0 | 1 {
  const byAddress = compareAddressv6(a.address, b.address);
  if (byAddress !== 0) return byAddress;
  if (a.prefixLength < b.prefixLength) return -1;
  if (a.prefixLength > b.prefixLength) return 1;
  return 0;
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
 * import { mapFromCidrv4, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 * import { parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(
 *   stringifyCidrv6(mapFromCidrv4(parseCidrv4("10.0.0.0/8"))),
 *   "::ffff:a00:0/104",
 * );
 * assertEquals(
 *   stringifyCidrv6(mapFromCidrv4(parseCidrv4("192.168.1.0/24"))),
 *   "::ffff:c0a8:100/120",
 * );
 * assertEquals(
 *   stringifyCidrv6(mapFromCidrv4(parseCidrv4("0.0.0.0/0"))),
 *   "::ffff:0:0/96",
 * );
 * ```
 */
export function mapFromCidrv4(cidr: Cidrv4): Cidrv6 {
  return {
    address: mapFromAddressv4(cidr.address),
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
 * import { parseCidrv6, unmapToCidrv4 } from "@hertzg/ip/cidrv6";
 * import { stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(
 *   stringifyCidrv4(unmapToCidrv4(parseCidrv6("::ffff:10.0.0.0/104"))),
 *   "10.0.0.0/8",
 * );
 * assertEquals(
 *   stringifyCidrv4(unmapToCidrv4(parseCidrv6("::ffff:192.168.1.0/120"))),
 *   "192.168.1.0/24",
 * );
 * assertEquals(
 *   stringifyCidrv4(unmapToCidrv4(parseCidrv6("::ffff:0.0.0.0/96"))),
 *   "0.0.0.0/0",
 * );
 * ```
 *
 * @example Throws for prefix length less than 96
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidrv6, unmapToCidrv4 } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => unmapToCidrv4(parseCidrv6("::ffff:0:0/64")), RangeError);
 * assertThrows(() => unmapToCidrv4(parseCidrv6("2001:db8::/32")), RangeError);
 * ```
 */
export function unmapToCidrv4(cidr: Cidrv6): Cidrv4 {
  if (cidr.prefixLength < IPV4_MAPPED_PREFIX_LENGTH) {
    throw new RangeError(
      `Prefix length ${cidr.prefixLength} is less than ${IPV4_MAPPED_PREFIX_LENGTH}`,
    );
  }
  return {
    address: unmapToAddressv4(cidr.address),
    prefixLength: cidr.prefixLength - IPV4_MAPPED_PREFIX_LENGTH,
  };
}
