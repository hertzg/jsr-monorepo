/**
 * IPv4 CIDR notation parsing and utilities.
 *
 * This module provides CIDR parsing, network calculations, and IP range
 * checking for IPv4 networks. Works with number representations to enable
 * efficient IP assignment workflows.
 *
 * A {@link Cidrv4} stores whichever dialect it was written in, a prefix
 * length (`10.0.0.0/8`) or a network mask (`10.0.0.0/255.0.0.0`), and every
 * operation here accepts both.
 *
 * @example CIDR operations
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * assert(cidrv4Contains(cidr, parseAddressv4("192.168.1.1")));
 * assertEquals(cidrv4Contains(cidr, parseAddressv4("192.168.2.1")), false);
 * ```
 *
 * @example Handing out assignable addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidrv4UsableAddresses,
 *   cidrv4UsableSize,
 *   parseCidrv4,
 * } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const pool = parseCidrv4("192.168.1.0/24");
 * const assigned = Array.from(cidrv4UsableAddresses(pool), stringifyAddressv4);
 *
 * assertEquals(assigned.length, cidrv4UsableSize(pool));
 * assertEquals(assigned[0], "192.168.1.1");
 * assertEquals(assigned.at(-1), "192.168.1.254");
 * ```
 *
 * @module
 */

import {
  compareAddressv4,
  parseAddressv4,
  stringifyAddressv4,
} from "./addressv4.ts";

/**
 * An IPv4 network mask as a 32-bit unsigned integer, e.g. `0xFFFFFF00`
 * for `/24`.
 *
 * A mask stored in a {@link MaskedCidrv4} is kept as given and is not
 * required to be contiguous; only {@link cidrv4PrefixLength} insists on
 * that, because it has no answer otherwise (ADR 0006).
 */
export type Maskv4 = number;

/**
 * An IPv4 prefix length, the `24` in `/24`. The range is 0 to 32; it is
 * documented rather than encoded in the type, so `prefixLength + 1` stays
 * a `PrefixLengthv4` (ADR 0002).
 */
export type PrefixLengthv4 = number;

/**
 * An IPv4 CIDR block written with a prefix length, as in `10.0.0.0/8`.
 */
export type PrefixedCidrv4 = {
  /** The IPv4 address from the CIDR notation */
  readonly address: number;
  /** The prefix length (0-32) */
  readonly prefixLength: PrefixLengthv4;
};

/**
 * An IPv4 CIDR block written with a network mask, as in
 * `10.0.0.0/255.0.0.0`.
 */
export type MaskedCidrv4 = {
  /** The IPv4 address from the CIDR notation */
  readonly address: number;
  /** The network mask, stored as given */
  readonly mask: Maskv4;
};

/**
 * Represents an IPv4 CIDR block.
 *
 * Contains only the parsed values from the CIDR notation, in whichever of
 * the two dialects it was written: a prefix length
 * ({@link PrefixedCidrv4}) or a network mask ({@link MaskedCidrv4}). Every
 * `cidrv4*` operation accepts both and works on the mask internally; a
 * result that has a dialect matches the input, and mixed inputs give the
 * mask form (ADR 0006).
 *
 * If a hand-built value carries both keys, `mask` wins, because the mask
 * is the form the operations compute on; nothing checks for the case.
 *
 * @example The two dialects describe the same block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { type Cidrv4, cidrv4Size, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const prefixed: Cidrv4 = parseCidrv4("10.0.0.0/8");
 * const masked: Cidrv4 = { address: prefixed.address, mask: 0xFF000000 };
 *
 * assertEquals(cidrv4Size(masked), cidrv4Size(prefixed));
 * ```
 */
export type Cidrv4 = PrefixedCidrv4 | MaskedCidrv4;

/**
 * Creates a network mask from an IPv4 prefix length.
 *
 * The prefix length must be between 0 and 32 (inclusive).
 *
 * @param prefixLength The CIDR prefix length (0-32)
 * @returns The network mask as a 32-bit unsigned integer
 * @throws {RangeError} If the prefix length is out of range
 *
 * @example Creating masks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Mask(24), 0xFFFFFF00);
 * assertEquals(cidrv4Mask(16), 0xFFFF0000);
 * assertEquals(cidrv4Mask(8), 0xFF000000);
 * assertEquals(cidrv4Mask(32), 0xFFFFFFFF);
 * assertEquals(cidrv4Mask(0), 0);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4Mask(-1), RangeError);
 * assertThrows(() => cidrv4Mask(33), RangeError);
 * ```
 */
export function cidrv4Mask(prefixLength: PrefixLengthv4): Maskv4;
/**
 * Returns the network mask of an IPv4 CIDR block.
 *
 * A {@link MaskedCidrv4} gives back the mask it stores, as is; a
 * {@link PrefixedCidrv4} has its prefix length shifted into one. Total over
 * every block, which is what lets every `cidrv4*` operation go through it;
 * the inverse, {@link cidrv4PrefixLength}, is the partial one.
 *
 * @param cidr The CIDR block
 * @returns The network mask as a 32-bit unsigned integer
 * @throws {RangeError} If a prefixed block's prefix length is out of range
 *
 * @example Both dialects yield the same mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Mask, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Mask(parseCidrv4("192.168.1.0/24")), 0xFFFFFF00);
 * assertEquals(cidrv4Mask({ address: 3232235776, mask: 0xFFFFFF00 }), 0xFFFFFF00);
 * ```
 *
 * @example A stored mask comes back untouched, contiguous or not
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Mask({ address: 0, mask: 0xFF00FF00 }), 0xFF00FF00);
 * ```
 */
export function cidrv4Mask(cidr: Cidrv4): Maskv4;
/**
 * Returns the network mask of an IPv4 CIDR block or prefix length.
 *
 * @param cidrOrPrefixLength A Cidrv4 block or a prefix length (0-32)
 * @returns The network mask as a 32-bit unsigned integer
 * @throws {RangeError} If a prefix length is out of range
 */
export function cidrv4Mask(cidrOrPrefixLength: Cidrv4 | PrefixLengthv4): Maskv4;
/** Returns the network mask of an IPv4 CIDR block or prefix length. */
export function cidrv4Mask(
  cidrOrPrefixLength: Cidrv4 | PrefixLengthv4,
): Maskv4 {
  let prefixLength: PrefixLengthv4;
  if (typeof cidrOrPrefixLength === "number") {
    prefixLength = cidrOrPrefixLength;
  } else if ("mask" in cidrOrPrefixLength) {
    return cidrOrPrefixLength.mask;
  } else {
    prefixLength = cidrOrPrefixLength.prefixLength;
  }

  if (
    prefixLength < 0 || prefixLength > 32 || !Number.isInteger(prefixLength)
  ) {
    throw new RangeError(
      `CIDR prefix length must be 0-32, got ${prefixLength}`,
    );
  }

  if (prefixLength === 0) {
    return 0;
  }

  return ((0xFFFFFFFF << (32 - prefixLength)) >>> 0);
}

/**
 * Recovers the prefix length from an IPv4 network mask given as a
 * 32-bit unsigned integer.
 *
 * @param mask The network mask as a 32-bit unsigned integer
 * @returns The prefix length (0-32)
 * @throws {TypeError} If the mask's one bits are not contiguous from the top
 * @throws {RangeError} If the mask is not an integer in 0 to 0xFFFFFFFF
 *
 * @example Recovering prefix lengths from numbers
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4PrefixLength(0xFFFFFF00), 24);
 * assertEquals(cidrv4PrefixLength(0xFFFF0000), 16);
 * assertEquals(cidrv4PrefixLength(0xFF000000), 8);
 * assertEquals(cidrv4PrefixLength(0xFFFFFFFF), 32);
 * assertEquals(cidrv4PrefixLength(0), 0);
 * ```
 */
export function cidrv4PrefixLength(mask: Maskv4): PrefixLengthv4;
/**
 * Returns the prefix length of an IPv4 CIDR block.
 *
 * A {@link PrefixedCidrv4} gives back the prefix length it stores; a
 * {@link MaskedCidrv4} has its mask converted, which is where this can
 * throw: a mask such as `255.0.255.0` describes no prefix length, so a
 * block storing one has no answer here (ADR 0006).
 *
 * @param cidr The CIDR block
 * @returns The prefix length (0-32)
 * @throws {TypeError} If a masked block's mask is not contiguous
 * @throws {RangeError} If a masked block's mask is not a 32-bit unsigned integer
 *
 * @example Both dialects yield the same prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4PrefixLength, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4PrefixLength(parseCidrv4("192.168.1.0/24")), 24);
 * assertEquals(cidrv4PrefixLength({ address: 3232235776, mask: 0xFFFFFF00 }), 24);
 * ```
 *
 * @example A non-contiguous mask has no prefix length
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4PrefixLength({ address: 0, mask: 0xFF00FF00 }), TypeError);
 * ```
 */
export function cidrv4PrefixLength(cidr: Cidrv4): PrefixLengthv4;
/**
 * Recovers the prefix length from an IPv4 network mask given in dotted
 * decimal notation.
 *
 * The string is parsed with the same rules as {@link parseAddressv4} -- four
 * octets, each 0-255, no leading zeros -- and then interpreted as a mask
 * rather than an address.
 *
 * @param mask The network mask in dotted decimal notation (e.g. "255.255.255.0")
 * @returns The prefix length (0-32)
 * @throws {TypeError} If the notation is malformed, or the mask's one bits
 *   are not contiguous from the top
 * @throws {RangeError} If any octet is out of range (not 0-255)
 *
 * @example Recovering prefix lengths from dotted decimal
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4PrefixLength("255.255.255.0"), 24);
 * assertEquals(cidrv4PrefixLength("255.255.0.0"), 16);
 * assertEquals(cidrv4PrefixLength("255.255.255.252"), 30);
 * assertEquals(cidrv4PrefixLength("0.0.0.0"), 0);
 * assertEquals(cidrv4PrefixLength("255.255.255.255"), 32);
 * ```
 *
 * @example Building a CIDR from an interface netmask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4PrefixLength, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const { address, netmask } = { address: "192.168.1.42", netmask: "255.255.255.0" };
 *
 * assertEquals(
 *   stringifyCidrv4({
 *     address: parseAddressv4(address),
 *     prefixLength: cidrv4PrefixLength(netmask),
 *   }),
 *   "192.168.1.42/24",
 * );
 * ```
 */
export function cidrv4PrefixLength(mask: string): PrefixLengthv4;
/**
 * Recovers the prefix length from an IPv4 CIDR block or network mask.
 *
 * The inverse of {@link cidrv4Mask}. Accepts a {@link Cidrv4} in either
 * dialect, a 32-bit unsigned integer, or dotted decimal notation.
 *
 * A CIDR mask is a run of one bits from the most significant end followed
 * by zeros; masks that do not have that shape (`0xFF00FF00`,
 * `"255.0.255.0"`) describe no prefix length at all and are rejected
 * rather than answered with a plausible-looking count of set bits. This is
 * the one place a stored mask is checked, because it is the one call that
 * has no answer for it (ADR 0006).
 *
 * @param cidrOrMask A Cidrv4 block, or the network mask as a 32-bit unsigned integer or dotted decimal
 * @returns The prefix length (0-32)
 * @throws {TypeError} If the mask is not contiguous, or the notation is malformed
 * @throws {RangeError} If the mask is out of range
 *
 * @example Both forms agree
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4PrefixLength("255.255.255.0"), 24);
 * assertEquals(cidrv4PrefixLength(0xFFFFFF00), 24);
 * ```
 *
 * @example Non-contiguous masks throw, in either form
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4PrefixLength(0xFF00FF00), TypeError);
 * assertThrows(() => cidrv4PrefixLength("255.0.255.0"), TypeError);
 * assertThrows(() => cidrv4PrefixLength("0.0.0.255"), TypeError);
 * ```
 *
 * @example Round-trips with cidrv4Mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Mask, cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * for (let prefixLength = 0; prefixLength <= 32; prefixLength++) {
 *   assertEquals(cidrv4PrefixLength(cidrv4Mask(prefixLength)), prefixLength);
 * }
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4PrefixLength } from "@hertzg/ip/cidrv4";
 *
 * // Wrong shape -- in range, but not a mask
 * assertThrows(() => cidrv4PrefixLength(0xFF00FF00), TypeError);
 * assertThrows(() => cidrv4PrefixLength("255.0.255.0"), TypeError);
 *
 * // Malformed notation
 * assertThrows(() => cidrv4PrefixLength("255.255.255"), TypeError);
 * assertThrows(() => cidrv4PrefixLength("255.255.255.256"), RangeError);
 *
 * // Wrong range -- not a 32-bit unsigned integer at all
 * assertThrows(() => cidrv4PrefixLength(-1), RangeError);
 * assertThrows(() => cidrv4PrefixLength(0x100000000), RangeError);
 * assertThrows(() => cidrv4PrefixLength(1.5), RangeError);
 * ```
 */
export function cidrv4PrefixLength(
  cidrOrMask: Cidrv4 | Maskv4 | string,
): PrefixLengthv4;
/** Recovers the prefix length from an IPv4 CIDR block or network mask. */
export function cidrv4PrefixLength(
  cidrOrMask: Cidrv4 | Maskv4 | string,
): PrefixLengthv4 {
  let value: Maskv4;
  if (typeof cidrOrMask === "string") {
    value = parseAddressv4(cidrOrMask);
  } else if (typeof cidrOrMask === "number") {
    value = cidrOrMask;
  } else if ("mask" in cidrOrMask) {
    value = cidrOrMask.mask;
  } else {
    return cidrOrMask.prefixLength;
  }

  if (value < 0 || value > 0xFFFFFFFF || !Number.isInteger(value)) {
    throw new RangeError(
      `IPv4 mask must be a 32-bit unsigned integer, got ${value}`,
    );
  }

  // The complement of a contiguous mask is a run of trailing ones, i.e.
  // 2^hostBits - 1. Only those values satisfy `n & (n + 1) === 0`.
  const hostBits = (~value) >>> 0;
  if ((hostBits & (hostBits + 1)) !== 0) {
    throw new TypeError(
      `IPv4 mask is not contiguous: 0x${value.toString(16).padStart(8, "0")}`,
    );
  }

  // clz32 counts the leading zeros of the complement, which are exactly
  // the mask's leading ones.
  return Math.clz32(hostBits);
}

/** Character codes the prefix-length scanner compares against. */
const CHAR_ZERO = 0x30;
const CHAR_NINE = 0x39;

/**
 * Reads a prefix length: decimal digits with no leading zero.
 *
 * `-` is not a digit, so a signed prefix length is a shape error here rather
 * than a range error from `cidrv4Mask`. That keeps the sign out of the
 * returned value, which is what let `"/-0"` through: `-0` is numerically `0`,
 * so it passes any range check and reaches the caller as a `Cidrv4` holding a
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
 * Parses an IPv4 CIDR notation string to a Cidrv4 object.
 *
 * Returns only the parsed values (address and prefix length).
 *
 * The prefix length is decimal digits and nothing else: no leading zeros, no
 * whitespace, no sign, and no trailing text.
 *
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24")
 * @returns A Cidrv4 object containing the parsed address and prefix length
 * @throws {TypeError} If the format is invalid, including a prefix length
 *   with leading zeros, whitespace or trailing text
 * @throws {RangeError} If the prefix length is out of range (not 0-32)
 * @throws Propagates errors from parseAddressv4 if the address part is invalid
 *
 * @example Basic CIDR parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidr.address, 3232235776);
 * assertEquals(cidr.prefixLength, 24);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => parseCidrv4("192.168.1.0"), TypeError);
 * assertThrows(() => parseCidrv4("192.168.1.0/"), TypeError);
 * assertThrows(() => parseCidrv4("192.168.1.0/33"), RangeError);
 * assertThrows(() => parseCidrv4("256.0.0.0/24"), RangeError);
 * assertThrows(() => parseCidrv4("192.168.1.0/024"), TypeError);
 * ```
 */
export function parseCidrv4(cidr: string): PrefixedCidrv4 {
  const parts = cidr.split("/");

  if (parts.length !== 2) {
    throw new TypeError(
      `CIDR notation must be in format '<address>/<prefix>', got ${parts.length} parts`,
    );
  }

  const address = parseAddressv4(parts[0]);
  const prefixLength = parsePrefixLength(parts[1]);

  // Validate prefix length
  cidrv4Mask(prefixLength);

  return {
    address,
    prefixLength,
  };
}

/**
 * Stringifies a Cidrv4 object to CIDR notation.
 *
 * The dialect is preserved: a {@link PrefixedCidrv4} is written as
 * `address/prefixLength`, a {@link MaskedCidrv4} as `address/mask` with the
 * mask in dotted decimal. The address is written as stored, host bits
 * included.
 *
 * @param cidr The Cidrv4 object to stringify
 * @returns The CIDR notation string (e.g., "192.168.1.0/24" or "192.168.1.0/255.255.255.0")
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(stringifyCidrv4(cidr), "192.168.1.0/24");
 * ```
 *
 * @example A masked block is written with its mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(
 *   stringifyCidrv4({ address: 167772160, mask: 0xFF000000 }),
 *   "10.0.0.0/255.0.0.0",
 * );
 * ```
 */
export function stringifyCidrv4(cidr: Cidrv4): string {
  const address = stringifyAddressv4(cidr.address);
  return "mask" in cidr
    ? `${address}/${stringifyAddressv4(cidr.mask)}`
    : `${address}/${cidr.prefixLength}`;
}

/**
 * Checks if an IPv4 address is contained within a CIDR block.
 *
 * @param cidr The CIDR block to check against
 * @param address The address to check, as a 32-bit unsigned integer
 * @returns true if the address is within the CIDR block, false otherwise
 *
 * @example Basic contains check
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Contains, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * assert(cidrv4Contains(cidr, parseAddressv4("192.168.1.0")));
 * assert(cidrv4Contains(cidr, parseAddressv4("192.168.1.100")));
 * assert(cidrv4Contains(cidr, parseAddressv4("192.168.1.255")));
 * assertEquals(cidrv4Contains(cidr, parseAddressv4("192.168.2.1")), false);
 * assertEquals(cidrv4Contains(cidr, parseAddressv4("192.168.0.255")), false);
 * ```
 *
 * @example IP assignment workflow
 * ```ts
 * import { assert } from "@std/assert";
 * import {
 *   cidrv4BroadcastAddress,
 *   cidrv4Contains,
 *   cidrv4NetworkAddress,
 *   parseCidrv4,
 * } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/29");
 * let currentIp = cidrv4NetworkAddress(cidr) + 1;
 *
 * const assigned: number[] = [];
 * while (currentIp < cidrv4BroadcastAddress(cidr)) {
 *   assert(cidrv4Contains(cidr, currentIp));
 *   assigned.push(currentIp);
 *   currentIp = currentIp + 1;
 * }
 * ```
 */
export function cidrv4Contains(cidr: Cidrv4, address: number): boolean {
  const mask = cidrv4Mask(cidr);
  const network = (cidr.address & mask) >>> 0;
  return ((address & mask) >>> 0) === network;
}

/**
 * Returns the first address of a CIDR block (network address).
 *
 * @param cidr The CIDR block
 * @returns The first address as a 32-bit unsigned integer
 *
 * @example Getting first address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4FirstAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4FirstAddress(cidr), parseAddressv4("192.168.1.0"));
 * ```
 */
export function cidrv4FirstAddress(cidr: Cidrv4): number {
  const mask = cidrv4Mask(cidr);
  return (cidr.address & mask) >>> 0;
}

/**
 * Returns the network address of a CIDR block.
 *
 * The network address is the block's first address — the one whose host
 * part is all zeros. It names the subnet itself rather than a machine on
 * it, so it is not assignable to an interface (RFC 1812 section 5.3.5);
 * {@link cidrv4FirstUsableAddress} is the first address that is. The
 * exception is a `/31` or `/32`, where the whole block is assignable.
 *
 * Same address as {@link cidrv4FirstAddress}, under the IPv4 name for it.
 * IPv6 has no counterpart to the {@link cidrv4BroadcastAddress} half of
 * this pair, which is why the `cidrv6` side stays with first/last only.
 *
 * @param cidr The CIDR block
 * @returns The network address as a 32-bit unsigned integer
 *
 * @example Getting network address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4NetworkAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4NetworkAddress(cidr), parseAddressv4("192.168.1.0"));
 * ```
 *
 * @example The network address is not assignable, the next one is
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidrv4FirstUsableAddress,
 *   cidrv4NetworkAddress,
 *   parseCidrv4,
 * } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/24");
 * assertEquals(stringifyAddressv4(cidrv4NetworkAddress(cidr)), "10.0.0.0");
 * assertEquals(stringifyAddressv4(cidrv4FirstUsableAddress(cidr)), "10.0.0.1");
 * ```
 */
export const cidrv4NetworkAddress: typeof cidrv4FirstAddress =
  cidrv4FirstAddress;

/**
 * Returns the last address of a CIDR block (broadcast address for IPv4).
 *
 * @param cidr The CIDR block
 * @returns The last address as a 32-bit unsigned integer
 *
 * @example Getting last address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4LastAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4LastAddress(cidr), parseAddressv4("192.168.1.255"));
 * ```
 */
export function cidrv4LastAddress(cidr: Cidrv4): number {
  const mask = cidrv4Mask(cidr);
  const network = (cidr.address & mask) >>> 0;
  return (network | (~mask >>> 0)) >>> 0;
}

/**
 * Returns the directed broadcast address of a CIDR block.
 *
 * The broadcast address is the block's last address — the one whose host
 * part is all ones. It addresses every machine on the subnet at once, so
 * it is not assignable to an interface (RFC 1812 section 5.3.5);
 * {@link cidrv4LastUsableAddress} is the last address that is. The
 * exception is a `/31` or `/32`, where the whole block is assignable.
 *
 * Same address as {@link cidrv4LastAddress}, under the IPv4 name for it.
 * IPv6 has no broadcast address at all, so there is deliberately no
 * `cidrv6BroadcastAddress` to pair with this one.
 *
 * @param cidr The CIDR block
 * @returns The broadcast address as a 32-bit unsigned integer
 *
 * @example Getting broadcast address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4BroadcastAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 * assertEquals(cidrv4BroadcastAddress(cidr), parseAddressv4("192.168.1.255"));
 * ```
 *
 * @example The broadcast address is not assignable, the one before it is
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   cidrv4BroadcastAddress,
 *   cidrv4LastUsableAddress,
 *   parseCidrv4,
 * } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/24");
 * assertEquals(stringifyAddressv4(cidrv4BroadcastAddress(cidr)), "10.0.0.255");
 * assertEquals(stringifyAddressv4(cidrv4LastUsableAddress(cidr)), "10.0.0.254");
 * ```
 */
export const cidrv4BroadcastAddress: typeof cidrv4LastAddress =
  cidrv4LastAddress;

/**
 * Checks whether every address in a block is assignable.
 *
 * True for `/31` (RFC 3021 point-to-point, both ends assignable) and `/32`
 * (a single host route). Both lack the reserved network and broadcast
 * addresses that shorter prefixes carve out. In mask terms: at most the
 * lowest bit is a host bit.
 *
 * @param mask The block's network mask
 * @returns true if the block reserves neither a network nor a broadcast address
 */
function cidrv4IsFullyUsable(mask: Maskv4): boolean {
  return (mask >>> 1) === 0x7FFFFFFF;
}

/**
 * Returns the first assignable address of a CIDR block.
 *
 * This is the {@link cidrv4NetworkAddress} plus one, because the network
 * address names the subnet rather than a machine on it (RFC 1812
 * section 5.3.5).
 *
 * Two prefix lengths are exceptions and yield the network address itself:
 *
 * - `/31` — a point-to-point link, where RFC 3021 assigns both addresses
 *   to the two ends and there is no broadcast address to reserve.
 * - `/32` — a host route, which is a single address and nothing else.
 *
 * Every IPv4 block therefore has at least one assignable address, so this
 * never returns a value outside the block and never has to signal "none".
 *
 * @param cidr The CIDR block
 * @returns The first assignable address as a 32-bit unsigned integer
 *
 * @example First assignable address of a subnet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4FirstUsableAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const gateway = cidrv4FirstUsableAddress(parseCidrv4("192.168.1.0/24"));
 * assertEquals(stringifyAddressv4(gateway), "192.168.1.1");
 * ```
 *
 * @example RFC 3021 /31 and /32 keep the network address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4FirstUsableAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(
 *   stringifyAddressv4(cidrv4FirstUsableAddress(parseCidrv4("10.0.0.0/31"))),
 *   "10.0.0.0",
 * );
 * assertEquals(
 *   stringifyAddressv4(cidrv4FirstUsableAddress(parseCidrv4("10.0.0.7/32"))),
 *   "10.0.0.7",
 * );
 * ```
 */
export function cidrv4FirstUsableAddress(cidr: Cidrv4): number {
  const mask = cidrv4Mask(cidr);
  const network = (cidr.address & mask) >>> 0;
  return cidrv4IsFullyUsable(mask) ? network : (network + 1) >>> 0;
}

/**
 * Returns the last assignable address of a CIDR block.
 *
 * This is the {@link cidrv4BroadcastAddress} minus one, because the
 * broadcast address addresses the whole subnet rather than a machine on
 * it (RFC 1812 section 5.3.5).
 *
 * Two prefix lengths are exceptions and yield the broadcast address
 * itself:
 *
 * - `/31` — a point-to-point link, where RFC 3021 assigns both addresses
 *   to the two ends and there is no broadcast address to reserve.
 * - `/32` — a host route, which is a single address and nothing else.
 *
 * @param cidr The CIDR block
 * @returns The last assignable address as a 32-bit unsigned integer
 *
 * @example Last assignable address of a subnet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4LastUsableAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const last = cidrv4LastUsableAddress(parseCidrv4("192.168.1.0/24"));
 * assertEquals(stringifyAddressv4(last), "192.168.1.254");
 * ```
 *
 * @example RFC 3021 /31 and /32 keep the broadcast address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4LastUsableAddress, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(
 *   stringifyAddressv4(cidrv4LastUsableAddress(parseCidrv4("10.0.0.0/31"))),
 *   "10.0.0.1",
 * );
 * assertEquals(
 *   stringifyAddressv4(cidrv4LastUsableAddress(parseCidrv4("10.0.0.7/32"))),
 *   "10.0.0.7",
 * );
 * ```
 */
export function cidrv4LastUsableAddress(cidr: Cidrv4): number {
  const mask = cidrv4Mask(cidr);
  const broadcast = (cidr.address | (~mask >>> 0)) >>> 0;
  return cidrv4IsFullyUsable(mask) ? broadcast : (broadcast - 1) >>> 0;
}

/**
 * Returns the total number of IP addresses in a CIDR block.
 *
 * For a /24 network, this returns 256. For a /32, this returns 1.
 *
 * @param cidr The CIDR block
 * @returns The total number of addresses in the CIDR block
 *
 * @example Getting CIDR size from Cidrv4 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Size, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Size(parseCidrv4("192.168.1.0/24")), 256);
 * assertEquals(cidrv4Size(parseCidrv4("10.0.0.0/8")), 16777216);
 * assertEquals(cidrv4Size(parseCidrv4("192.168.1.1/32")), 1);
 * assertEquals(cidrv4Size(parseCidrv4("0.0.0.0/0")), 4294967296);
 * ```
 */
export function cidrv4Size(cidr: Cidrv4): number;
/**
 * Returns the total number of IP addresses for a given prefix length.
 *
 * @param prefixLength The CIDR prefix length (0-32)
 * @returns The total number of addresses
 * @throws {RangeError} If the prefix length is out of range (not 0-32)
 *
 * @example Getting CIDR size from prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Size } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Size(24), 256);
 * assertEquals(cidrv4Size(8), 16777216);
 * assertEquals(cidrv4Size(32), 1);
 * assertEquals(cidrv4Size(0), 4294967296);
 * ```
 *
 * @example Out-of-range prefix length throws
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4Size } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4Size(-1), RangeError);
 * assertThrows(() => cidrv4Size(33), RangeError);
 * ```
 */
export function cidrv4Size(prefixLength: PrefixLengthv4): number;
/**
 * Returns the total number of IP addresses for either a CIDR block or a prefix length.
 *
 * @param cidrOrPrefixLength A Cidrv4 block or a prefix length (0-32)
 * @returns The total number of addresses
 */
export function cidrv4Size(
  cidrOrPrefixLength: Cidrv4 | PrefixLengthv4,
): number;
/** Returns the total number of IP addresses for either a CIDR block or a prefix length. */
export function cidrv4Size(
  cidrOrPrefixLength: Cidrv4 | PrefixLengthv4,
): number {
  // The host bits of the mask, plus one. For a contiguous mask that is
  // 2 ** (32 - prefixLength); for any other stored mask it is a number
  // that means nothing, which is the caller's problem (ADR 0006).
  return (~cidrv4Mask(cidrOrPrefixLength) >>> 0) + 1;
}

/**
 * Returns the number of assignable addresses in a CIDR block.
 *
 * This is {@link cidrv4Size} minus the network and broadcast addresses,
 * except at `/31` and `/32` where the whole block is assignable — see
 * {@link cidrv4FirstUsableAddress}. Writing `cidrv4Size(cidr) - 2` by
 * hand gets `0` for a `/31` and `-1` for a `/32`, which is why this is a
 * function rather than a note in the docs.
 *
 * The result is never zero: every IPv4 block has at least one assignable
 * address.
 *
 * @param cidr The CIDR block
 * @returns The number of assignable addresses
 *
 * @example Usable size from a Cidrv4 object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4UsableSize, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4UsableSize(parseCidrv4("192.168.1.0/24")), 254);
 * assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.0/30")), 2);
 * assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.0/31")), 2);
 * assertEquals(cidrv4UsableSize(parseCidrv4("10.0.0.1/32")), 1);
 * ```
 */
export function cidrv4UsableSize(cidr: Cidrv4): number;
/**
 * Returns the number of assignable addresses for a given prefix length.
 *
 * @param prefixLength The CIDR prefix length (0-32)
 * @returns The number of assignable addresses
 * @throws {RangeError} If the prefix length is out of range (not 0-32)
 *
 * @example Usable size from a prefix length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4UsableSize } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4UsableSize(24), 254);
 * assertEquals(cidrv4UsableSize(31), 2);
 * assertEquals(cidrv4UsableSize(32), 1);
 * assertEquals(cidrv4UsableSize(0), 4294967294);
 * ```
 *
 * @example Out-of-range prefix length throws
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrv4UsableSize } from "@hertzg/ip/cidrv4";
 *
 * assertThrows(() => cidrv4UsableSize(-1), RangeError);
 * assertThrows(() => cidrv4UsableSize(33), RangeError);
 * ```
 */
export function cidrv4UsableSize(prefixLength: PrefixLengthv4): number;
/**
 * Returns the number of assignable addresses for either a CIDR block or a prefix length.
 *
 * @param cidrOrPrefixLength A Cidrv4 block or a prefix length (0-32)
 * @returns The number of assignable addresses
 */
export function cidrv4UsableSize(
  cidrOrPrefixLength: Cidrv4 | PrefixLengthv4,
): number;
/** Returns the number of assignable addresses for either a CIDR block or a prefix length. */
export function cidrv4UsableSize(
  cidrOrPrefixLength: Cidrv4 | PrefixLengthv4,
): number {
  const mask = cidrv4Mask(cidrOrPrefixLength);
  const size = (~mask >>> 0) + 1;
  return cidrv4IsFullyUsable(mask) ? size : size - 2;
}

/**
 * Checks if one IPv4 CIDR block fully contains another.
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
 * import { cidrv4ContainsCidr, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assert(cidrv4ContainsCidr(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.1.0.0/16")));
 * assert(cidrv4ContainsCidr(parseCidrv4("192.168.0.0/16"), parseCidrv4("192.168.1.0/24")));
 * assertEquals(cidrv4ContainsCidr(parseCidrv4("192.168.1.0/24"), parseCidrv4("192.168.0.0/16")), false);
 * ```
 *
 * @example Equal CIDRs contain each other
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv4ContainsCidr, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/24");
 * assert(cidrv4ContainsCidr(cidr, cidr));
 * ```
 *
 * @example /0 contains everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv4ContainsCidr, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const all = parseCidrv4("0.0.0.0/0");
 * assert(cidrv4ContainsCidr(all, parseCidrv4("192.168.1.0/24")));
 * assert(cidrv4ContainsCidr(all, parseCidrv4("10.0.0.1/32")));
 * ```
 */
export function cidrv4ContainsCidr(outer: Cidrv4, inner: Cidrv4): boolean {
  const outerMask = cidrv4Mask(outer);
  const innerMask = cidrv4Mask(inner);
  // Every bit outer fixes, inner must fix too: the shorter-or-equal prefix.
  if (((outerMask & innerMask) >>> 0) !== outerMask) return false;
  return ((outer.address & outerMask) >>> 0) ===
    ((inner.address & outerMask) >>> 0);
}

/**
 * Checks if two IPv4 CIDR blocks overlap (share at least one address).
 *
 * Two CIDRs overlap when one contains at least one address of the other.
 * This is equivalent to checking containment using the shorter prefix.
 * The check is symmetric: `cidrv4Overlaps(a, b) === cidrv4Overlaps(b, a)`.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if the two CIDR blocks share at least one address
 *
 * @example Overlapping CIDRs
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrv4Overlaps, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assert(cidrv4Overlaps(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.1.0.0/16")));
 * assert(cidrv4Overlaps(parseCidrv4("10.1.0.0/16"), parseCidrv4("10.0.0.0/8")));
 * assert(cidrv4Overlaps(parseCidrv4("192.168.1.0/24"), parseCidrv4("192.168.1.0/24")));
 * assertEquals(cidrv4Overlaps(parseCidrv4("10.0.0.0/8"), parseCidrv4("172.16.0.0/12")), false);
 * ```
 *
 * @example /0 overlaps everything
 * ```ts
 * import { assert } from "@std/assert";
 * import { cidrv4Overlaps, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const all = parseCidrv4("0.0.0.0/0");
 * assert(cidrv4Overlaps(all, parseCidrv4("192.168.1.0/24")));
 * assert(cidrv4Overlaps(all, parseCidrv4("10.0.0.1/32")));
 * ```
 *
 * @example Adjacent but non-overlapping
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Overlaps, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Overlaps(parseCidrv4("192.168.0.0/24"), parseCidrv4("192.168.1.0/24")), false);
 * ```
 */
export function cidrv4Overlaps(a: Cidrv4, b: Cidrv4): boolean {
  // The bits both blocks fix: the shorter prefix of the two.
  const mask = (cidrv4Mask(a) & cidrv4Mask(b)) >>> 0;
  return ((a.address & mask) >>> 0) === ((b.address & mask) >>> 0);
}

/**
 * Splits an IPv4 CIDR block into its two half-sized children at prefix+1.
 *
 * The children are in the same dialect as the parent.
 *
 * @param cidr The CIDR block to split
 * @returns A tuple of the lower and upper halves
 */
function cidrv4SplitHalves(cidr: Cidrv4): [Cidrv4, Cidrv4] {
  const mask = cidrv4Mask(cidr);
  const network = (cidr.address & mask) >>> 0;
  // The next longer prefix: one more leading one bit.
  const childMask = ((mask >>> 1) | 0x80000000) >>> 0;
  const upper = (network | (childMask ^ mask)) >>> 0;
  if ("mask" in cidr) {
    return [
      { address: network, mask: childMask },
      { address: upper, mask: childMask },
    ];
  }
  const prefixLength = cidr.prefixLength + 1;
  return [
    { address: network, prefixLength },
    { address: upper, prefixLength },
  ];
}

/**
 * Returns the intersection of two IPv4 CIDR blocks.
 *
 * Since CIDR blocks are power-of-2-aligned, two overlapping blocks always
 * have a containment relationship -- the intersection is the more specific
 * (longer prefix) block with its canonical network address.
 *
 * The result matches the dialect of the inputs. When they disagree, it is
 * a {@link MaskedCidrv4} (ADR 0006).
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns The overlapping CIDR with canonical network address, or null if disjoint
 *
 * @example Find overlap between allocations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Intersect, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Intersect(
 *   parseCidrv4("192.168.1.0/24"),
 *   parseCidrv4("192.168.1.0/28"),
 * );
 * assertEquals(result && stringifyCidrv4(result), "192.168.1.0/28");
 * ```
 *
 * @example No overlap returns null
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Intersect, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(cidrv4Intersect(
 *   parseCidrv4("10.0.0.0/8"),
 *   parseCidrv4("172.16.0.0/12"),
 * ), null);
 * ```
 *
 * @example Mixed dialects intersect to a masked block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Intersect, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Intersect(
 *   parseCidrv4("192.168.1.0/24"),
 *   { address: 3232235776, mask: 0xFFFFFFF0 },
 * );
 * assertEquals(result, { address: 3232235776, mask: 0xFFFFFFF0 });
 * ```
 */
export function cidrv4Intersect(a: Cidrv4, b: Cidrv4): Cidrv4 | null {
  if (!cidrv4Overlaps(a, b)) return null;
  const aMask = cidrv4Mask(a);
  const bMask = cidrv4Mask(b);
  // The more specific block is the one whose mask covers the other's.
  const [inner, mask] = ((aMask & bMask) >>> 0) === bMask
    ? [a, aMask]
    : [b, bMask];
  const address = (inner.address & mask) >>> 0;
  if ("mask" in a || "mask" in b) return { address, mask };
  return { address, prefixLength: cidrv4PrefixLength(inner) };
}

/**
 * Subtracts one IPv4 CIDR block from another.
 *
 * Returns the minimal set of CIDR blocks representing all IP addresses
 * in `a` but not in `b`. The algorithm recursively splits `a` into two
 * halves at prefix+1, keeping the non-overlapping half and recursing
 * into the overlapping half.
 *
 * The result matches the dialect of the inputs. When they disagree, it is
 * in {@link MaskedCidrv4} form (ADR 0006).
 *
 * @param a The CIDR block to subtract from
 * @param b The CIDR block to subtract
 * @returns Array of CIDR blocks covering a minus b
 *
 * @example Carve a /28 from a /24
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("192.168.1.0/24"),
 *   parseCidrv4("192.168.1.0/28"),
 * );
 * assertEquals(result.map(stringifyCidrv4), [
 *   "192.168.1.128/25",
 *   "192.168.1.64/26",
 *   "192.168.1.32/27",
 *   "192.168.1.16/28",
 * ]);
 * ```
 *
 * @example No overlap -- original returned unchanged
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("10.0.0.0/24"),
 *   parseCidrv4("172.16.0.0/24"),
 * );
 * assertEquals(result.map(stringifyCidrv4), ["10.0.0.0/24"]);
 * ```
 *
 * @example Full containment -- empty result
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("192.168.1.0/28"),
 *   parseCidrv4("192.168.1.0/24"),
 * );
 * assertEquals(result, []);
 * ```
 *
 * @example Mixed dialects subtract to masked blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Subtract, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrv4Subtract(
 *   parseCidrv4("192.168.1.0/25"),
 *   { address: 3232235776, mask: 0xFFFFFFC0 },
 * );
 * assertEquals(result.map(stringifyCidrv4), ["192.168.1.64/255.255.255.192"]);
 * ```
 */
export function cidrv4Subtract(a: Cidrv4, b: Cidrv4): Cidrv4[] {
  // Every piece is carved from `a`, so `a` carries the output dialect. Move
  // it to the mask form when `b` is masked and `a` is not.
  if (!("mask" in a) && "mask" in b) {
    return cidrv4Subtract({ address: a.address, mask: cidrv4Mask(a) }, b);
  }
  if (!cidrv4Overlaps(a, b)) return [a];
  if (cidrv4ContainsCidr(b, a)) return [];
  const [lower, upper] = cidrv4SplitHalves(a);
  return [...cidrv4Subtract(upper, b), ...cidrv4Subtract(lower, b)];
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
 * from the offset to the boundary (broadcast for positive step, network for negative step).
 *
 * @param cidr The CIDR block to generate addresses from
 * @param options Optional configuration for address generation
 * @param options.offset The offset from the network address (0-based, defaults to 0 for network address)
 * @param options.count The maximum number of addresses to generate (defaults to undefined = iterate until CIDR boundary)
 * @param options.step The increment between addresses (positive or negative, defaults to 1)
 * @returns A generator yielding IP addresses as 32-bit unsigned integers (may yield less than count if CIDR boundary is reached)
 *
 * @example Default behavior - iterate full CIDR block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("10.0.0.0/29"); // 8 IPs: .0 to .7
 *
 * // By default, iterates from offset 0 (network address) to CIDR boundary
 * const all = Array.from(cidrv4Addresses(cidr));
 * assertEquals(all.map(stringifyAddressv4), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2", "10.0.0.3",
 *   "10.0.0.4", "10.0.0.5", "10.0.0.6", "10.0.0.7",
 * ]);
 * assertEquals(all.length, 8); // All 8 IPs in /29
 *
 * // Skip network address by specifying offset 1
 * const usable = Array.from(cidrv4Addresses(cidr, { offset: 1 }));
 * assertEquals(usable.length, 7); // Skip network address
 * ```
 *
 * @example Limiting with count parameter
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // Get first 3 IPs starting at network address
 * const first3 = Array.from(cidrv4Addresses(cidr, { offset: 0, count: 3 }));
 * assertEquals(first3, [
 *   parseAddressv4("192.168.1.0"),
 *   parseAddressv4("192.168.1.1"),
 *   parseAddressv4("192.168.1.2"),
 * ]);
 *
 * // Get 5 IPs starting at offset 10
 * const offset10 = Array.from(cidrv4Addresses(cidr, { offset: 10, count: 5 }));
 * assertEquals(offset10[0], parseAddressv4("192.168.1.10"));
 * assertEquals(offset10[4], parseAddressv4("192.168.1.14"));
 * ```
 *
 * @example Custom step for even/odd IPs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // Get every other IP (even addresses)
 * const evenIps = Array.from(cidrv4Addresses(cidr, { offset: 0, count: 5, step: 2 }));
 * assertEquals(evenIps, [
 *   parseAddressv4("192.168.1.0"),
 *   parseAddressv4("192.168.1.2"),
 *   parseAddressv4("192.168.1.4"),
 *   parseAddressv4("192.168.1.6"),
 *   parseAddressv4("192.168.1.8"),
 * ]);
 *
 * // Get odd addresses
 * const oddIps = Array.from(cidrv4Addresses(cidr, { offset: 1, count: 5, step: 2 }));
 * assertEquals(oddIps[0], parseAddressv4("192.168.1.1"));
 * assertEquals(oddIps[1], parseAddressv4("192.168.1.3"));
 * ```
 *
 * @example Negative step for reverse iteration
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/24");
 *
 * // Get 5 IPs counting backwards from offset 10
 * const backwards = Array.from(cidrv4Addresses(cidr, { offset: 10, count: 5, step: -1 }));
 * assertEquals(backwards, [
 *   parseAddressv4("192.168.1.10"),
 *   parseAddressv4("192.168.1.9"),
 *   parseAddressv4("192.168.1.8"),
 *   parseAddressv4("192.168.1.7"),
 *   parseAddressv4("192.168.1.6"),
 * ]);
 * ```
 *
 * @example CIDR boundary handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Addresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const cidr = parseCidrv4("192.168.1.0/29"); // Only 8 IPs: .0 to .7
 *
 * // Requesting more IPs than available stops at CIDR boundary
 * const ips = Array.from(cidrv4Addresses(cidr, { offset: 5, count: 10, step: 1 }));
 * assertEquals(ips.length, 3); // Only .5, .6, .7 are in range
 *
 * // Negative step stops at CIDR start
 * const reverseIps = Array.from(cidrv4Addresses(cidr, { offset: 3, count: 10, step: -1 }));
 * assertEquals(reverseIps.length, 4); // .3, .2, .1, .0
 * ```
 */
export function* cidrv4Addresses(
  cidr: Cidrv4,
  options?: {
    offset?: number;
    count?: number;
    step?: number;
  },
): Generator<number> {
  const network = cidrv4NetworkAddress(cidr);
  const offset = options?.offset ?? 0;
  const count = options?.count;
  const step = options?.step ?? 1;

  let currentIp = (network + offset) >>> 0;
  const maxCount = count !== undefined ? count : Infinity;

  let i = 0;
  while (i < maxCount && cidrv4Contains(cidr, currentIp)) {
    yield currentIp;
    currentIp = (currentIp + step) >>> 0;
    i++;
  }
}

/**
 * Generates every assignable address in a CIDR block, in ascending order.
 *
 * Yields {@link cidrv4FirstUsableAddress} through
 * {@link cidrv4LastUsableAddress} inclusive — {@link cidrv4UsableSize}
 * addresses in total, with the network and broadcast addresses skipped
 * except at `/31` and `/32` where the whole block is assignable.
 *
 * Lazy: nothing is materialized, so a short prefix costs nothing until
 * the caller iterates it.
 *
 * Unlike {@link cidrv4Addresses} this takes no offset, count, or step —
 * its extent is fixed by the block. Reach for `cidrv4Addresses` to slice
 * a block on any other terms.
 *
 * @param cidr The CIDR block to enumerate
 * @returns A generator yielding assignable addresses as 32-bit unsigned integers
 *
 * @example Assign addresses out of a pool
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4UsableAddresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const pool = Array.from(cidrv4UsableAddresses(parseCidrv4("10.0.1.0/29")));
 * assertEquals(pool.map(stringifyAddressv4), [
 *   "10.0.1.1",
 *   "10.0.1.2",
 *   "10.0.1.3",
 *   "10.0.1.4",
 *   "10.0.1.5",
 *   "10.0.1.6",
 * ]);
 * ```
 *
 * @example RFC 3021 /31 yields both ends of the link
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4UsableAddresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const link = Array.from(cidrv4UsableAddresses(parseCidrv4("10.0.0.0/31")));
 * assertEquals(link.map(stringifyAddressv4), ["10.0.0.0", "10.0.0.1"]);
 *
 * const route = Array.from(cidrv4UsableAddresses(parseCidrv4("10.0.0.7/32")));
 * assertEquals(route.map(stringifyAddressv4), ["10.0.0.7"]);
 * ```
 *
 * @example Lazy — a /8 costs nothing until iterated
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4UsableAddresses, parseCidrv4 } from "@hertzg/ip/cidrv4";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const addresses = cidrv4UsableAddresses(parseCidrv4("10.0.0.0/8"));
 * assertEquals(stringifyAddressv4(addresses.next().value as number), "10.0.0.1");
 * addresses.return(undefined);
 * ```
 */
export function* cidrv4UsableAddresses(cidr: Cidrv4): Generator<number> {
  yield* cidrv4Addresses(cidr, {
    offset: cidrv4IsFullyUsable(cidrv4Mask(cidr)) ? 0 : 1,
    count: cidrv4UsableSize(cidr),
  });
}

/**
 * Checks if two IPv4 CIDR blocks are sibling halves of the same parent block.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if a and b are siblings
 */
function cidrv4AreSiblings(a: MaskedCidrv4, b: MaskedCidrv4): boolean {
  if (a.mask !== b.mask || a.mask === 0) return false;
  const parentMask = (a.mask << 1) >>> 0;
  return ((a.address & parentMask) >>> 0) === ((b.address & parentMask) >>> 0);
}

/**
 * Merges IPv4 CIDR blocks into the minimal covering set.
 *
 * Takes an array of possibly overlapping, adjacent, or redundant CIDR
 * blocks and returns the minimal set of non-overlapping CIDR prefix
 * blocks covering the exact same address space.
 *
 * The result matches the dialect of the inputs. When they disagree, it is
 * in {@link MaskedCidrv4} form (ADR 0006).
 *
 * @param cidrs The CIDR blocks to merge
 * @returns Minimal set of non-overlapping CIDR blocks, sorted by address
 *
 * @example Compact a firewall allowlist
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Merge, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const rules = [
 *   parseCidrv4("10.0.1.0/24"),
 *   parseCidrv4("10.0.0.0/24"),
 *   parseCidrv4("10.0.0.128/25"),
 * ];
 * const compacted = cidrv4Merge(rules);
 * assertEquals(compacted.map(stringifyCidrv4), ["10.0.0.0/23"]);
 * ```
 *
 * @example Aggregate routes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Merge, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const routes = [
 *   parseCidrv4("198.51.100.0/25"),
 *   parseCidrv4("198.51.100.128/26"),
 *   parseCidrv4("198.51.100.192/26"),
 *   parseCidrv4("203.0.113.0/24"),
 * ];
 * assertEquals(cidrv4Merge(routes).map(stringifyCidrv4), [
 *   "198.51.100.0/24",
 *   "203.0.113.0/24",
 * ]);
 * ```
 *
 * @example Masked blocks merge to masked blocks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrv4Merge, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const halves = [
 *   { address: 167772160, mask: 0xFFFFFF80 },
 *   { address: 167772288, mask: 0xFFFFFF80 },
 * ];
 * assertEquals(cidrv4Merge(halves).map(stringifyCidrv4), ["10.0.0.0/255.255.255.0"]);
 * ```
 */
export function cidrv4Merge(cidrs: readonly Cidrv4[]): Cidrv4[] {
  if (cidrs.length === 0) return [];

  // Step 1: Normalize - apply mask to get canonical network addresses, and
  // work in the mask dialect from here on. Any masked input makes the
  // result masked too.
  let masked = false;
  let list: MaskedCidrv4[] = cidrs.map((cidr) => {
    if ("mask" in cidr) masked = true;
    const mask = cidrv4Mask(cidr);
    return { address: (cidr.address & mask) >>> 0, mask };
  });

  // Step 2: Sort so supernets precede their subnets
  list.sort(compareCidrv4);

  // Step 3: Remove contained blocks
  const deduped: MaskedCidrv4[] = [];
  let currentLast = -1;
  for (const cidr of list) {
    const last = cidrv4LastAddress(cidr);
    if (last <= currentLast) continue;
    deduped.push(cidr);
    currentLast = last;
  }
  list = deduped;

  // Step 4: Merge adjacent siblings iteratively until stable
  let changed = true;
  while (changed) {
    changed = false;
    const merged: MaskedCidrv4[] = [];
    let i = 0;
    while (i < list.length) {
      if (
        i + 1 < list.length && cidrv4AreSiblings(list[i], list[i + 1])
      ) {
        merged.push({
          address: list[i].address,
          mask: (list[i].mask << 1) >>> 0,
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

  // Step 5: Return in the input dialect
  if (masked) return list;
  return list.map(({ address, mask }) => ({
    address,
    prefixLength: cidrv4PrefixLength(mask),
  }));
}

/**
 * Compares two IPv4 CIDR blocks for sorting.
 *
 * Orders by address ascending, then by prefix length ascending — so where
 * two blocks share a start address, the shorter prefix (the larger block,
 * the supernet) sorts first. This is the order PostgreSQL's `cidr` type
 * uses, and the order every containing block needs to precede the blocks
 * it contains, which is what {@link cidrv4Merge} relies on internally.
 *
 * The block is ordered **as written**: the `address` field is compared as
 * stored, without applying the network mask first. A block carrying host
 * bits therefore sorts by the address {@link stringifyCidrv4} will print
 * for it, and `10.0.0.5/24` does not compare equal to `10.0.0.0/24` even
 * though they cover the same addresses. Normalize with
 * {@link cidrv4NetworkAddress} first if that is the order you want.
 *
 * Both dialects are compared by mask, so `10.0.0.0/8` and
 * `10.0.0.0/255.0.0.0` are equal, and the order is the same as by prefix
 * length: `/8` is `0xFF000000`, `/9` is `0xFF800000`. Comparing masks
 * rather than prefix lengths is what keeps a comparator total, since a
 * mask always exists and a prefix length does not (ADR 0006).
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort a routing table
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidrv4, parseCidrv4, stringifyCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const routes = ["192.168.1.0/24", "10.0.0.0/16", "10.0.0.0/8"].map(parseCidrv4);
 *
 * assertEquals(routes.toSorted(compareCidrv4).map(stringifyCidrv4), [
 *   "10.0.0.0/8",
 *   "10.0.0.0/16",
 *   "192.168.1.0/24",
 * ]);
 * ```
 *
 * @example A supernet sorts before its subnets
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidrv4, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * assertEquals(compareCidrv4(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.0.0.0/16")), -1);
 * assertEquals(compareCidrv4(parseCidrv4("10.0.0.0/16"), parseCidrv4("10.0.0.0/8")), 1);
 * assertEquals(compareCidrv4(parseCidrv4("10.0.0.0/8"), parseCidrv4("10.0.0.0/8")), 0);
 * ```
 *
 * @example The dialect does not affect the order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidrv4, parseCidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const prefixed = parseCidrv4("10.0.0.0/8");
 * const masked = { address: prefixed.address, mask: 0xFF000000 };
 *
 * assertEquals(compareCidrv4(prefixed, masked), 0);
 * assertEquals(compareCidrv4(masked, parseCidrv4("10.0.0.0/16")), -1);
 * ```
 */
export function compareCidrv4(a: Cidrv4, b: Cidrv4): -1 | 0 | 1 {
  const byAddress = compareAddressv4(a.address, b.address);
  if (byAddress !== 0) return byAddress;
  const aMask = cidrv4Mask(a);
  const bMask = cidrv4Mask(b);
  if (aMask < bMask) return -1;
  if (aMask > bMask) return 1;
  return 0;
}
