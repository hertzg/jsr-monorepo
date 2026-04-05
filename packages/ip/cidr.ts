/**
 * Universal CIDR notation parsing, stringifying, and validation.
 *
 * This module provides {@link parseCidr}, {@link stringifyCidr},
 * {@link isValidCidr}, {@link cidrContainsCidr}, {@link cidrOverlaps},
 * {@link cidrIntersect}, and {@link cidrSubtract}
 * that auto-detect IPv4 vs IPv6 and delegate to the appropriate
 * version-specific function.
 *
 * For version-specific functions, see:
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): {@link parseCidrv4}, {@link stringifyCidrv4}, {@link isValidCidrv4}
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): {@link parseCidrv6}, {@link stringifyCidrv6}, {@link isValidCidrv6}
 *
 * @example Parse and stringify any CIDR block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * // IPv4
 * const v4 = parseCidr("192.168.1.0/24");
 * assertEquals(v4.prefixLength, 24);
 * assertEquals(stringifyCidr(v4), "192.168.1.0/24");
 *
 * // IPv6
 * const v6 = parseCidr("2001:db8::/32");
 * assertEquals(v6.prefixLength, 32);
 * assertEquals(stringifyCidr(v6), "2001:db8::/32");
 * ```
 *
 * @module
 */

import {
  type Cidrv4,
  cidrv4ContainsCidr,
  cidrv4Intersect,
  cidrv4Overlaps,
  cidrv4Subtract,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";
import {
  type Cidrv6,
  cidrv6ContainsCidr,
  cidrv6Intersect,
  cidrv6Overlaps,
  cidrv6Subtract,
  parseCidrv6,
  stringifyCidrv6,
} from "./cidrv6.ts";

/**
 * Parses an IPv4 or IPv6 CIDR notation string.
 *
 * Detects the IP version by checking for `:` in the input — if present,
 * the CIDR is parsed as IPv6 (returning {@link Cidrv6}), otherwise as IPv4
 * (returning {@link Cidrv4}).
 *
 * @param cidr The CIDR notation string (e.g., "192.168.1.0/24" or "2001:db8::/32")
 * @returns The parsed CIDR as `Cidrv4` or `Cidrv6`
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If values are out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr } from "@hertzg/ip/cidr";
 *
 * const v4 = parseCidr("10.0.0.0/8");
 * assertEquals(v4.prefixLength, 8);
 *
 * const v6 = parseCidr("fe80::/10");
 * assertEquals(v6.prefixLength, 10);
 * ```
 */
export function parseCidr(cidr: string): Cidrv4 | Cidrv6 {
  if (cidr.includes(":")) {
    return parseCidrv6(cidr);
  }
  return parseCidrv4(cidr);
}

/** Stringifies a {@link Cidrv4} to IPv4 CIDR notation. */
export function stringifyCidr(cidr: Cidrv4): string;
/** Stringifies a {@link Cidrv6} to IPv6 CIDR notation. */
export function stringifyCidr(cidr: Cidrv6): string;
/**
 * Stringifies a {@link Cidrv4} or {@link Cidrv6} to CIDR notation.
 *
 * @param cidr The CIDR object
 * @returns The CIDR notation string
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(stringifyCidr(parseCidr("192.168.1.0/24")), "192.168.1.0/24");
 * assertEquals(stringifyCidr(parseCidr("2001:db8::/32")), "2001:db8::/32");
 * ```
 */
export function stringifyCidr(cidr: Cidrv4 | Cidrv6): string;
export function stringifyCidr(cidr: Cidrv4 | Cidrv6): string {
  if (typeof cidr.address === "bigint") {
    return stringifyCidrv6(cidr as Cidrv6);
  }
  return stringifyCidrv4(cidr as Cidrv4);
}

/** Checks if one IPv4 CIDR block fully contains another. */
export function cidrContainsCidr(
  outer: Cidrv4,
  inner: Cidrv4,
): boolean;
/** Checks if one IPv6 CIDR block fully contains another. */
export function cidrContainsCidr(
  outer: Cidrv6,
  inner: Cidrv6,
): boolean;
/** Mixed IPv4/IPv6 always returns false. */
export function cidrContainsCidr(
  outer: Cidrv4,
  inner: Cidrv6,
): false;
/** Mixed IPv4/IPv6 always returns false. */
export function cidrContainsCidr(
  outer: Cidrv6,
  inner: Cidrv4,
): false;
/**
 * Checks if one CIDR block fully contains another.
 *
 * Dispatches to {@link cidrv4ContainsCidr} or {@link cidrv6ContainsCidr}
 * based on the address type. Returns false when the two CIDRs are different
 * IP versions (mixing IPv4 and IPv6).
 *
 * @param outer The CIDR block that may contain the other
 * @param inner The CIDR block that may be contained
 * @returns true if every address in `inner` is within `outer`, false otherwise
 *
 * @example IPv4 containment
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrContainsCidr, parseCidr } from "@hertzg/ip/cidr";
 *
 * assert(cidrContainsCidr(parseCidr("10.0.0.0/8"), parseCidr("10.1.0.0/16")));
 * assertEquals(cidrContainsCidr(parseCidr("10.1.0.0/16"), parseCidr("10.0.0.0/8")), false);
 * ```
 *
 * @example IPv6 containment
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrContainsCidr, parseCidr } from "@hertzg/ip/cidr";
 *
 * assert(cidrContainsCidr(parseCidr("2001:db8::/32"), parseCidr("2001:db8:1::/48")));
 * assertEquals(cidrContainsCidr(parseCidr("2001:db8:1::/48"), parseCidr("2001:db8::/32")), false);
 * ```
 *
 * @example Mixed versions return false
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrContainsCidr, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(cidrContainsCidr(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")), false);
 * assertEquals(cidrContainsCidr(parseCidr("2001:db8::/32"), parseCidr("10.0.0.0/8")), false);
 * ```
 */
export function cidrContainsCidr(
  outer: Cidrv4 | Cidrv6,
  inner: Cidrv4 | Cidrv6,
): boolean;
export function cidrContainsCidr(
  outer: Cidrv4 | Cidrv6,
  inner: Cidrv4 | Cidrv6,
): boolean {
  const outerIsBigint = typeof outer.address === "bigint";
  const innerIsBigint = typeof inner.address === "bigint";
  if (outerIsBigint !== innerIsBigint) return false;
  if (outerIsBigint) {
    return cidrv6ContainsCidr(outer as Cidrv6, inner as Cidrv6);
  }
  return cidrv4ContainsCidr(outer as Cidrv4, inner as Cidrv4);
}

/** Checks if two IPv4 CIDR blocks overlap. */
export function cidrOverlaps(
  a: Cidrv4,
  b: Cidrv4,
): boolean;
/** Checks if two IPv6 CIDR blocks overlap. */
export function cidrOverlaps(
  a: Cidrv6,
  b: Cidrv6,
): boolean;
/** Mixed IPv4/IPv6 always returns false. */
export function cidrOverlaps(
  a: Cidrv4,
  b: Cidrv6,
): false;
/** Mixed IPv4/IPv6 always returns false. */
export function cidrOverlaps(
  a: Cidrv6,
  b: Cidrv4,
): false;
/**
 * Checks if two CIDR blocks overlap (share at least one address).
 *
 * Dispatches to {@link cidrv4Overlaps} or {@link cidrv6Overlaps}
 * based on the address type. Returns false when the two CIDRs are different
 * IP versions (mixing IPv4 and IPv6).
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if the two CIDR ranges share at least one address, false otherwise
 *
 * @example IPv4 overlap
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrOverlaps, parseCidr } from "@hertzg/ip/cidr";
 *
 * assert(cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("10.1.0.0/16")));
 * assertEquals(cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("172.16.0.0/12")), false);
 * ```
 *
 * @example IPv6 overlap
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrOverlaps, parseCidr } from "@hertzg/ip/cidr";
 *
 * assert(cidrOverlaps(parseCidr("2001:db8::/32"), parseCidr("2001:db8:1::/48")));
 * assertEquals(cidrOverlaps(parseCidr("2001:db8::/32"), parseCidr("2001:db9::/32")), false);
 * ```
 *
 * @example Mixed versions return false
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrOverlaps, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")), false);
 * assertEquals(cidrOverlaps(parseCidr("::/0"), parseCidr("0.0.0.0/0")), false);
 * ```
 */
export function cidrOverlaps(
  a: Cidrv4 | Cidrv6,
  b: Cidrv4 | Cidrv6,
): boolean;
export function cidrOverlaps(
  a: Cidrv4 | Cidrv6,
  b: Cidrv4 | Cidrv6,
): boolean {
  const aIsBigint = typeof a.address === "bigint";
  const bIsBigint = typeof b.address === "bigint";
  if (aIsBigint !== bIsBigint) return false;
  if (aIsBigint) {
    return cidrv6Overlaps(a as Cidrv6, b as Cidrv6);
  }
  return cidrv4Overlaps(a as Cidrv4, b as Cidrv4);
}

/** Returns the intersection of two IPv4 CIDR blocks. */
export function cidrIntersect(a: Cidrv4, b: Cidrv4): Cidrv4 | null;
/** Returns the intersection of two IPv6 CIDR blocks. */
export function cidrIntersect(a: Cidrv6, b: Cidrv6): Cidrv6 | null;
/**
 * Returns the intersection of two CIDR blocks.
 *
 * Dispatches to {@link cidrv4Intersect} or {@link cidrv6Intersect}
 * based on the address type. Throws {@link TypeError} when mixing
 * IPv4 and IPv6 CIDRs.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns The overlapping CIDR with canonical network address, or null if disjoint
 * @throws {TypeError} If the two CIDRs are different IP versions
 *
 * @example IPv4 intersection
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrIntersect, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 * import type { Cidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrIntersect(parseCidr("10.0.0.0/8"), parseCidr("10.1.0.0/16"));
 * assertEquals(result && stringifyCidr(result as Cidrv4), "10.1.0.0/16");
 * ```
 *
 * @example IPv6 intersection
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrIntersect, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 * import type { Cidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrIntersect(parseCidr("2001:db8::/32"), parseCidr("2001:db8:1::/48"));
 * assertEquals(result && stringifyCidr(result as Cidrv6), "2001:db8:1::/48");
 * ```
 *
 * @example Mixed versions throw TypeError
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrIntersect, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertThrows(
 *   () => cidrIntersect(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
 *   TypeError,
 * );
 * ```
 */
export function cidrIntersect(
  a: Cidrv4 | Cidrv6,
  b: Cidrv4 | Cidrv6,
): Cidrv4 | Cidrv6 | null;
export function cidrIntersect(
  a: Cidrv4 | Cidrv6,
  b: Cidrv4 | Cidrv6,
): Cidrv4 | Cidrv6 | null {
  const aIsBigint = typeof a.address === "bigint";
  const bIsBigint = typeof b.address === "bigint";
  if (aIsBigint !== bIsBigint) {
    throw new TypeError("Cannot intersect IPv4 and IPv6 CIDR blocks");
  }
  if (aIsBigint) {
    return cidrv6Intersect(a as Cidrv6, b as Cidrv6);
  }
  return cidrv4Intersect(a as Cidrv4, b as Cidrv4);
}

/** Subtracts one IPv4 CIDR block from another. */
export function cidrSubtract(a: Cidrv4, b: Cidrv4): Cidrv4[];
/** Subtracts one IPv6 CIDR block from another. */
export function cidrSubtract(a: Cidrv6, b: Cidrv6): Cidrv6[];
/**
 * Subtracts one CIDR block from another.
 *
 * Dispatches to {@link cidrv4Subtract} or {@link cidrv6Subtract}
 * based on the address type. Throws {@link TypeError} when mixing
 * IPv4 and IPv6 CIDRs.
 *
 * @param a The CIDR block to subtract from
 * @param b The CIDR block to subtract
 * @returns Array of CIDR blocks covering a minus b
 * @throws {TypeError} If the two CIDRs are different IP versions
 *
 * @example IPv4 subtraction
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrSubtract, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 * import type { Cidrv4 } from "@hertzg/ip/cidrv4";
 *
 * const result = cidrSubtract(parseCidr("10.0.0.0/24"), parseCidr("172.16.0.0/24"));
 * assertEquals(result.map((c) => stringifyCidr(c as Cidrv4)), ["10.0.0.0/24"]);
 * ```
 *
 * @example IPv6 subtraction
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrSubtract, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 * import type { Cidrv6 } from "@hertzg/ip/cidrv6";
 *
 * const result = cidrSubtract(parseCidr("2001:db8::/32"), parseCidr("2001:db9::/32"));
 * assertEquals(result.map((c) => stringifyCidr(c as Cidrv6)), ["2001:db8::/32"]);
 * ```
 *
 * @example Mixed versions throw TypeError
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrSubtract, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertThrows(
 *   () => cidrSubtract(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
 *   TypeError,
 * );
 * ```
 */
export function cidrSubtract(
  a: Cidrv4 | Cidrv6,
  b: Cidrv4 | Cidrv6,
): (Cidrv4 | Cidrv6)[];
export function cidrSubtract(
  a: Cidrv4 | Cidrv6,
  b: Cidrv4 | Cidrv6,
): (Cidrv4 | Cidrv6)[] {
  const aIsBigint = typeof a.address === "bigint";
  const bIsBigint = typeof b.address === "bigint";
  if (aIsBigint !== bIsBigint) {
    throw new TypeError("Cannot subtract IPv4 and IPv6 CIDR blocks");
  }
  if (aIsBigint) {
    return cidrv6Subtract(a as Cidrv6, b as Cidrv6);
  }
  return cidrv4Subtract(a as Cidrv4, b as Cidrv4);
}
