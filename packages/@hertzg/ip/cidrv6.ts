/**
 * IPv6 CIDR notation parsing and utilities.
 *
 * This module provides CIDR parsing, network calculations, and IP range
 * checking for IPv6 networks. Works with bigint representations to enable
 * efficient IP assignment workflows.
 *
 * A {@link Cidrv6} stores whichever dialect it was written in, a prefix
 * length (`fe80::/10`) or a network mask (`fe80::/ffc0::`), and every
 * operation here accepts both.
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
import type { Cidrv4, MaskedCidrv4, PrefixedCidrv4 } from "./cidrv4.ts";

/**
 * An IPv6 network mask as a 128-bit unsigned bigint, e.g.
 * `0xFFFFFFFFFFFFFFFF0000000000000000n` for `/64`.
 *
 * A mask stored in a {@link MaskedCidrv6} is kept as given and is not
 * required to be contiguous; only {@link cidrv6PrefixLength} insists on
 * that, because it has no answer otherwise (ADR 0006).
 */
export type Maskv6 = bigint;

/**
 * An IPv6 prefix length, the `64` in `/64`. The range is 0 to 128; it is
 * documented rather than encoded in the type, so `prefixLength + 1` stays
 * a `PrefixLengthv6` (ADR 0002).
 */
export type PrefixLengthv6 = number;

/**
 * An IPv6 CIDR block written with a prefix length, as in `2001:db8::/32`.
 */
export type PrefixedCidrv6 = {
  /** The IPv6 address from the CIDR notation */
  readonly address: bigint;
  /** The prefix length (0-128) */
  readonly prefixLength: PrefixLengthv6;
};

/**
 * An IPv6 CIDR block written with a network mask, as in
 * `2001:db8::/ffff:ffff::`.
 */
export type MaskedCidrv6 = {
  /** The IPv6 address from the CIDR notation */
  readonly address: bigint;
  /** The network mask, stored as given */
  readonly mask: Maskv6;
};

/**
 * Represents an IPv6 CIDR block.
 *
 * Contains only the parsed values from the CIDR notation, in whichever of
 * the two dialects it was written: a prefix length
 * ({@link PrefixedCidrv6}) or a network mask ({@link MaskedCidrv6}). Every
 * `cidrv6*` operation accepts both and works on the mask internally; a
 * result that has a dialect matches the input, and mixed inputs give the
 * mask form (ADR 0006).
 *
 * The union keeps an object literal from carrying both keys. If a
 * hand-built value does carry both, `mask` wins, because the mask is the
 * form the operations compute on; nothing checks for the case.
 *
 * @example The two dialects describe the same block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { type Cidrv6, cidrv6Size, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const prefixed: Cidrv6 = parseCidrv6("2001:db8::/32");
 * const masked: Cidrv6 = {
 *   address: prefixed.address,
 *   mask: 0xFFFFFFFF000000000000000000000000n,
 * };
 *
 * assertEquals(cidrv6Size(masked), cidrv6Size(prefixed));
 * ```
 */
export type Cidrv6 = PrefixedCidrv6 | MaskedCidrv6;

/** All 128 bits set: the `/128` mask, and the modulus of every bit operation here. */
const MASK_ALL_V6 = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn;

/**
 * Builds a block in the requested dialect from a network address and a
 * contiguous mask.
 *
 * `masked` is decided by the caller from its inputs: any masked input gives
 * a masked result, otherwise the result is prefixed. The mask is always one
 * the caller derived from contiguous masks by shifting, so converting it
 * back cannot throw.
 *
 * @param address The network address
 * @param mask The block's mask, contiguous
 * @param masked Whether to emit the mask dialect
 * @returns The block, in the requested dialect
 */
function cidrv6Block(address: bigint, mask: Maskv6, masked: boolean): Cidrv6 {
  return masked
    ? { address, mask }
    : { address, prefixLength: cidrv6PrefixLength(mask) };
}

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
export function cidrv6Mask(prefixLength: PrefixLengthv6): Maskv6;
/**
 * Returns the network mask of an IPv6 CIDR block.
 *
 * A {@link MaskedCidrv6} gives back the mask it stores, as is; a
 * {@link PrefixedCidrv6} has its prefix length looked up. This is the
 * accessor every `cidrv6*` operation goes through, so it is what makes
 * both dialects behave the same.
 *
 * @param cidr The CIDR block
 * @returns The network mask as a bigint
 * @throws {RangeError} If a prefixed block's prefix length is out of range
 *
 * @example Both dialects yield the same mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Mask, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const mask = 0xFFFFFFFF000000000000000000000000n;
 * assertEquals(cidrv6Mask(parseCidrv6("2001:db8::/32")), mask);
 * assertEquals(cidrv6Mask({ address: 0x20010db8n << 96n, mask }), mask);
 * ```
 *
 * @example A stored mask comes back untouched, contiguous or not
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Mask } from "@hertzg/ip/cidrv6";
 *
 * const mask = 0xFFFF0000FFFF00000000000000000000n;
 * assertEquals(cidrv6Mask({ address: 0n, mask }), mask);
 * ```
 */
export function cidrv6Mask(cidr: Cidrv6): Maskv6;
/**
 * Returns the network mask of an IPv6 CIDR block or prefix length.
 *
 * Total over every {@link Cidrv6}: the mask dialect is read, the prefix
 * dialect is looked up. The inverse, {@link cidrv6PrefixLength}, is the
 * partial one.
 *
 * @param cidrOrPrefixLength A Cidrv6 block or a prefix length (0-128)
 * @returns The network mask as a bigint
 * @throws {RangeError} If a prefix length is out of range
 */
export function cidrv6Mask(cidrOrPrefixLength: Cidrv6 | PrefixLengthv6): Maskv6;
/** Returns the network mask of an IPv6 CIDR block or prefix length. */
export function cidrv6Mask(
  cidrOrPrefixLength: Cidrv6 | PrefixLengthv6,
): Maskv6 {
  let prefixLength: PrefixLengthv6;
  if (typeof cidrOrPrefixLength === "number") {
    prefixLength = cidrOrPrefixLength;
  } else if ("mask" in cidrOrPrefixLength) {
    return cidrOrPrefixLength.mask;
  } else {
    prefixLength = cidrOrPrefixLength.prefixLength;
  }

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
export function cidrv6PrefixLength(mask: Maskv6): PrefixLengthv6;
/**
 * Returns the prefix length of an IPv6 CIDR block.
 *
 * A {@link PrefixedCidrv6} gives back the prefix length it stores; a
 * {@link MaskedCidrv6} has its mask converted, which is where this can
 * throw: a mask such as `ffff:0:ffff::` describes no prefix length, so a
 * block storing one has no answer here (ADR 0006).
 *
 * @param cidr The CIDR block
 * @returns The prefix length (0-128)
 * @throws {TypeError} If a masked block's mask is not contiguous
 * @throws {RangeError} If a masked block's mask is not a 128-bit unsigned integer
 *
 * @example Both dialects yield the same prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6PrefixLength, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(cidrv6PrefixLength(parseCidrv6("2001:db8::/32")), 32);
 * assertEquals(
 *   cidrv6PrefixLength({ address: 0x20010db8n << 96n, mask: 0xFFFFFFFF000000000000000000000000n }),
 *   32,
 * );
 * ```
 *
 * @example A non-contiguous mask has no prefix length
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv6PrefixLength } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(
 *   () => cidrv6PrefixLength({ address: 0n, mask: 0xFFFF0000FFFF00000000000000000000n }),
 *   TypeError,
 * );
 * ```
 */
export function cidrv6PrefixLength(cidr: Cidrv6): PrefixLengthv6;
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
export function cidrv6PrefixLength(mask: string): PrefixLengthv6;
/**
 * Recovers the prefix length from an IPv6 CIDR block or network mask.
 *
 * The inverse of {@link cidrv6Mask}. Accepts a {@link Cidrv6} in either
 * dialect, a bigint, or colon-hexadecimal notation.
 *
 * A CIDR mask is a run of one bits from the most significant end followed
 * by zeros; masks that do not have that shape describe no prefix length at
 * all and are rejected rather than answered with a plausible-looking count
 * of set bits. This is the one place a stored mask is checked, because it
 * is the one call that has no answer for it (ADR 0006).
 *
 * @param cidrOrMask A Cidrv6 block, or the network mask as a bigint or colon-hexadecimal notation
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
export function cidrv6PrefixLength(
  cidrOrMask: Cidrv6 | Maskv6 | string,
): PrefixLengthv6;
/** Recovers the prefix length from an IPv6 CIDR block or network mask. */
export function cidrv6PrefixLength(
  cidrOrMask: Cidrv6 | Maskv6 | string,
): PrefixLengthv6 {
  let value: Maskv6;
  if (typeof cidrOrMask === "string") {
    value = parseAddressv6(cidrOrMask);
  } else if (typeof cidrOrMask === "bigint") {
    value = cidrOrMask;
  } else if ("mask" in cidrOrMask) {
    value = cidrOrMask.mask;
  } else {
    return cidrOrMask.prefixLength;
  }

  if (value < 0n || value > MASK_ALL_V6) {
    throw new RangeError(
      `IPv6 mask must be a 128-bit unsigned integer, got ${value}`,
    );
  }

  // The complement of a contiguous mask is a run of trailing ones, i.e.
  // 2^hostBitCount - 1. Only those values satisfy `n & (n + 1) === 0`.
  const hostBits = ~value & MASK_ALL_V6;
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
export function parseCidrv6(cidr: string): PrefixedCidrv6 {
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
 * The dialect is preserved: a {@link PrefixedCidrv6} is written as
 * `address/prefixLength`, a {@link MaskedCidrv6} as `address/mask` with the
 * mask in compressed colon-hexadecimal. The address is written as stored,
 * host bits included.
 *
 * @param cidr The Cidrv6 object to stringify
 * @returns The CIDR notation string (e.g., "2001:db8::/32" or "2001:db8::/ffff:ffff::")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const cidr = parseCidrv6("2001:db8::/32");
 * assertEquals(stringifyCidrv6(cidr), "2001:db8::/32");
 * ```
 *
 * @example A masked block is written with its mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(
 *   stringifyCidrv6({ address: 0xfe80n << 112n, mask: 0xFFFFFFFF000000000000000000000000n }),
 *   "fe80::/ffff:ffff::",
 * );
 * ```
 */
export function stringifyCidrv6(cidr: Cidrv6): string {
  const address = stringifyAddressv6(cidr.address);
  return "mask" in cidr
    ? `${address}/${stringifyAddressv6(cidr.mask)}`
    : `${address}/${cidr.prefixLength}`;
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
  const mask = cidrv6Mask(cidr);
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
  const mask = cidrv6Mask(cidr);
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
  const mask = cidrv6Mask(cidr);
  const network = cidr.address & mask;
  return network | (~mask & MASK_ALL_V6);
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
  let prefixLength: PrefixLengthv6;
  if (typeof cidrOrPrefixLength === "number") {
    prefixLength = cidrOrPrefixLength;
  } else if ("mask" in cidrOrPrefixLength) {
    // The host bits of the mask, plus one. For a contiguous mask that is
    // 2 ** (128 - prefixLength); for any other stored mask it is a number
    // that means nothing, which is the caller's problem (ADR 0006).
    return (~cidrOrPrefixLength.mask & MASK_ALL_V6) + 1n;
  } else {
    prefixLength = cidrOrPrefixLength.prefixLength;
  }

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
  const outerMask = cidrv6Mask(outer);
  const innerMask = cidrv6Mask(inner);
  // Every bit outer fixes, inner must fix too: the shorter-or-equal prefix.
  if ((outerMask & innerMask) !== outerMask) return false;
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
  // The bits both blocks fix: the shorter prefix of the two.
  const mask = cidrv6Mask(a) & cidrv6Mask(b);
  return (a.address & mask) === (b.address & mask);
}

/**
 * Splits an IPv6 CIDR block into its two half-sized children at prefix+1.
 *
 * The children are in the same dialect as the parent.
 *
 * @param cidr The CIDR block to split
 * @returns A tuple of the lower and upper halves
 */
function cidrv6SplitHalves(cidr: Cidrv6): [Cidrv6, Cidrv6] {
  const mask = cidrv6Mask(cidr);
  const network = cidr.address & mask;
  // The next longer prefix: one more leading one bit.
  const childMask = (mask >> 1n) | (1n << 127n);
  const upperBit = childMask & ~mask;
  const masked = "mask" in cidr;
  return [
    cidrv6Block(network, childMask, masked),
    cidrv6Block(network | upperBit, childMask, masked),
  ];
}

/**
 * Returns the intersection of two IPv6 CIDR blocks.
 *
 * Since CIDR blocks are power-of-2-aligned, two overlapping blocks always
 * have a containment relationship -- the intersection is the more specific
 * (longer prefix) block with its canonical network address.
 *
 * The result matches the dialect of the inputs. When they disagree, it is
 * a {@link MaskedCidrv6} (ADR 0006).
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
 *
 * @example Mixed dialects intersect to a masked block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Intersect, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const mask = 0xFFFFFFFFFFFF00000000000000000000n;
 * const result = cidrv6Intersect(
 *   parseCidrv6("2001:db8::/32"),
 *   { address: 0x20010db8n << 96n, mask },
 * );
 * assertEquals(result, { address: 0x20010db8n << 96n, mask });
 * ```
 */
export function cidrv6Intersect(a: Cidrv6, b: Cidrv6): Cidrv6 | null {
  const aMask = cidrv6Mask(a);
  const bMask = cidrv6Mask(b);
  const overlapMask = aMask & bMask;
  if ((a.address & overlapMask) !== (b.address & overlapMask)) return null;
  // The more specific block is the one whose mask covers the other's.
  const inner = overlapMask === bMask ? a : b;
  const innerMask = overlapMask === bMask ? aMask : bMask;
  return cidrv6Block(
    inner.address & innerMask,
    innerMask,
    "mask" in a || "mask" in b,
  );
}

/**
 * Subtracts one IPv6 CIDR block from another.
 *
 * Returns the minimal set of CIDR blocks representing all IP addresses
 * in `a` but not in `b`. The algorithm recursively splits `a` into two
 * halves at prefix+1, keeping the non-overlapping half and recursing
 * into the overlapping half.
 *
 * The result matches the dialect of the inputs. When they disagree, it is
 * in {@link MaskedCidrv6} form (ADR 0006).
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
 *
 * @example Mixed dialects subtract to masked blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Subtract, parseCidrv6, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrv6Subtract(
 *   parseCidrv6("2001:db8::/32"),
 *   { address: 0x20010db8n << 96n, mask: 0xFFFFFFFF800000000000000000000000n },
 * );
 * assertEquals(result.map(stringifyCidrv6), ["2001:db8:8000::/ffff:ffff:8000::"]);
 * ```
 */
export function cidrv6Subtract(a: Cidrv6, b: Cidrv6): Cidrv6[] {
  // Every piece is carved from `a`, so `a` carries the output dialect. Move
  // it to the mask form when `b` is masked and `a` is not.
  if (!("mask" in a) && "mask" in b) {
    return cidrv6Subtract({ address: a.address, mask: cidrv6Mask(a) }, b);
  }
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
function cidrv6AreSiblings(a: MaskedCidrv6, b: MaskedCidrv6): boolean {
  if (a.mask !== b.mask || a.mask === 0n) return false;
  const parentMask = (a.mask << 1n) & MASK_ALL_V6;
  return (a.address & parentMask) === (b.address & parentMask);
}

/**
 * Merges IPv6 CIDR blocks into the minimal covering set.
 *
 * Takes an array of possibly overlapping, adjacent, or redundant CIDR
 * blocks and returns the minimal set of non-overlapping CIDR prefix
 * blocks covering the exact same address space.
 *
 * The result matches the dialect of the inputs. When they disagree, it is
 * in {@link MaskedCidrv6} form (ADR 0006).
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
 *
 * @example Masked blocks merge to masked blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv6Merge, stringifyCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const mask = 0xFFFFFFFF800000000000000000000000n;
 * const halves = [
 *   { address: 0x20010db8n << 96n, mask },
 *   { address: 0x20010db88000n << 80n, mask },
 * ];
 * assertEquals(cidrv6Merge(halves).map(stringifyCidrv6), ["2001:db8::/ffff:ffff::"]);
 * ```
 */
export function cidrv6Merge(cidrs: readonly Cidrv6[]): Cidrv6[] {
  if (cidrs.length === 0) return [];

  // Step 1: Normalize - apply mask to get canonical network addresses, and
  // work in the mask dialect from here on
  let list: MaskedCidrv6[] = cidrs.map((cidr) => {
    const mask = cidrv6Mask(cidr);
    return { address: cidr.address & mask, mask };
  });

  // Step 2: Sort so supernets precede their subnets
  list.sort(compareCidrv6);

  // Step 3: Remove contained blocks
  const deduped: MaskedCidrv6[] = [];
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
    const merged: MaskedCidrv6[] = [];
    let i = 0;
    while (i < list.length) {
      if (
        i + 1 < list.length && cidrv6AreSiblings(list[i], list[i + 1])
      ) {
        merged.push({
          address: list[i].address,
          mask: (list[i].mask << 1n) & MASK_ALL_V6,
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

  // Step 5: Return in the input dialect; any masked input makes it the mask
  const masked = cidrs.some((cidr) => "mask" in cidr);
  return list.map(({ address, mask }) => cidrv6Block(address, mask, masked));
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
 * Both dialects are compared by mask, so `2001:db8::/32` and
 * `2001:db8::/ffff:ffff::` are equal, and the order is the same as by
 * prefix length: `/32` is `ffff:ffff::`, `/33` is `ffff:ffff:8000::`.
 * Comparing masks rather than prefix lengths is what keeps a comparator
 * total, since a mask always exists and a prefix length does not
 * (ADR 0006).
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
 *
 * @example The dialect does not affect the order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidrv6, parseCidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const prefixed = parseCidrv6("2001:db8::/32");
 * const masked = { address: prefixed.address, mask: 0xFFFFFFFF000000000000000000000000n };
 *
 * assertEquals(compareCidrv6(prefixed, masked), 0);
 * assertEquals(compareCidrv6(masked, parseCidrv6("2001:db8::/48")), -1);
 * ```
 */
export function compareCidrv6(a: Cidrv6, b: Cidrv6): -1 | 0 | 1 {
  const byAddress = compareAddressv6(a.address, b.address);
  if (byAddress !== 0) return byAddress;
  const aMask = cidrv6Mask(a);
  const bMask = cidrv6Mask(b);
  if (aMask < bMask) return -1;
  if (aMask > bMask) return 1;
  return 0;
}

/** The number of prefix bits occupied by the IPv4-mapped prefix (`::ffff:0:0/96`). */
const IPV4_MAPPED_PREFIX_LENGTH = 96;

/** The mask of the IPv4-mapped prefix itself: the high 96 bits. */
const IPV4_MAPPED_PREFIX_MASK = 0xFFFFFFFFFFFFFFFFFFFFFFFF00000000n;

/**
 * Converts an IPv4 CIDR block with a prefix length to its IPv4-mapped
 * IPv6 CIDR representation.
 *
 * @param cidr The IPv4 CIDR block
 * @returns The equivalent IPv4-mapped IPv6 CIDR block, with a prefix length
 */
export function mapFromCidrv4(cidr: PrefixedCidrv4): PrefixedCidrv6;
/**
 * Converts an IPv4 CIDR block with a mask to its IPv4-mapped IPv6 CIDR
 * representation.
 *
 * @param cidr The IPv4 CIDR block
 * @returns The equivalent IPv4-mapped IPv6 CIDR block, with a mask
 */
export function mapFromCidrv4(cidr: MaskedCidrv4): MaskedCidrv6;
/**
 * Converts an IPv4 CIDR block to its IPv4-mapped IPv6 CIDR representation.
 *
 * The address is embedded into the `::ffff:0:0/96` prefix. The dialect is
 * preserved: a prefix length is offset by 96, so an IPv4 `/8` becomes an
 * IPv6 `/104`; a mask becomes the low 32 bits under the all-ones `/96`
 * prefix, so `255.0.0.0` becomes `ffff:ffff:ffff:ffff:ffff:ffff:ff00:0`.
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
 *
 * @example A masked block maps to a masked block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mapFromCidrv4 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(
 *   mapFromCidrv4({ address: 167772160, mask: 0xFF000000 }),
 *   { address: 0xFFFF0A000000n, mask: 0xFFFFFFFFFFFFFFFFFFFFFFFFFF000000n },
 * );
 * ```
 */
export function mapFromCidrv4(cidr: Cidrv4): Cidrv6;
/** Converts an IPv4 CIDR block to its IPv4-mapped IPv6 CIDR representation. */
export function mapFromCidrv4(cidr: Cidrv4): Cidrv6 {
  const address = mapFromAddressv4(cidr.address);
  if ("mask" in cidr) {
    return { address, mask: IPV4_MAPPED_PREFIX_MASK | BigInt(cidr.mask) };
  }
  return {
    address,
    prefixLength: cidr.prefixLength + IPV4_MAPPED_PREFIX_LENGTH,
  };
}

/**
 * Converts an IPv4-mapped IPv6 CIDR block with a prefix length to its IPv4
 * CIDR representation.
 *
 * @param cidr The IPv6 CIDR block (must have prefix length >= 96)
 * @returns The equivalent IPv4 CIDR block, with a prefix length
 * @throws {RangeError} If prefix length is less than 96
 */
export function unmapToCidrv4(cidr: PrefixedCidrv6): PrefixedCidrv4;
/**
 * Converts an IPv4-mapped IPv6 CIDR block with a mask to its IPv4 CIDR
 * representation.
 *
 * @param cidr The IPv6 CIDR block (its mask must fix the whole `/96` prefix)
 * @returns The equivalent IPv4 CIDR block, with a mask
 * @throws {RangeError} If the mask's high 96 bits are not all ones
 */
export function unmapToCidrv4(cidr: MaskedCidrv6): MaskedCidrv4;
/**
 * Converts an IPv4-mapped IPv6 CIDR block to its IPv4 CIDR representation.
 *
 * The IPv4 address is extracted from the `::ffff:0:0/96` prefix. The
 * dialect is preserved: a prefix length is reduced by 96, so an IPv6
 * `/104` becomes an IPv4 `/8`; a mask keeps its low 32 bits.
 *
 * A block unmaps only when the whole `::ffff:0:0/96` prefix is fixed
 * (ADR 0004): a prefix length of 96 or longer, or a mask whose high 96
 * bits are all ones. Anything shorter is an IPv6 block that happens to
 * start in the mapped range, and narrowing it would lose information.
 *
 * @param cidr The IPv6 CIDR block
 * @returns The equivalent IPv4 CIDR block
 * @throws {RangeError} If the block does not fix the whole `/96` prefix
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
 * @example A masked block unmaps to a masked block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { unmapToCidrv4 } from "@hertzg/ip/cidrv6";
 *
 * assertEquals(
 *   unmapToCidrv4({
 *     address: 0xFFFF0A000000n,
 *     mask: 0xFFFFFFFFFFFFFFFFFFFFFFFFFF000000n,
 *   }),
 *   { address: 167772160, mask: 0xFF000000 },
 * );
 * ```
 *
 * @example Throws when the /96 prefix is not fixed
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidrv6, unmapToCidrv4 } from "@hertzg/ip/cidrv6";
 *
 * assertThrows(() => unmapToCidrv4(parseCidrv6("::ffff:0:0/64")), RangeError);
 * assertThrows(() => unmapToCidrv4(parseCidrv6("2001:db8::/32")), RangeError);
 * assertThrows(
 *   () => unmapToCidrv4({ address: 0xFFFF0A000000n, mask: 0xFFFFFFFFFFFFFFFF0000000000000000n }),
 *   RangeError,
 * );
 * ```
 */
export function unmapToCidrv4(cidr: Cidrv6): Cidrv4;
/** Converts an IPv4-mapped IPv6 CIDR block to its IPv4 CIDR representation. */
export function unmapToCidrv4(cidr: Cidrv6): Cidrv4 {
  if ("mask" in cidr) {
    if ((cidr.mask & IPV4_MAPPED_PREFIX_MASK) !== IPV4_MAPPED_PREFIX_MASK) {
      throw new RangeError(
        `Mask 0x${
          cidr.mask.toString(16).padStart(32, "0")
        } does not fix the ${IPV4_MAPPED_PREFIX_LENGTH}-bit IPv4-mapped prefix`,
      );
    }
    return {
      address: unmapToAddressv4(cidr.address),
      mask: Number(cidr.mask & 0xFFFFFFFFn),
    };
  }
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
