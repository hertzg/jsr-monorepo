/**
 * Universal CIDR notation parsing, stringifying, and validation.
 *
 * This module provides {@link parseCidr}, {@link stringifyCidr},
 * {@link isValidCidr}, {@link cidrContainsCidr}, {@link cidrOverlaps},
 * {@link cidrIntersect}, {@link cidrSubtract}, {@link cidrMerge},
 * {@link cidrSize}, and {@link cidrAddresses} that auto-detect IPv4 vs IPv6
 * and delegate to the appropriate version-specific function. The {@link Cidr}
 * type alias and {@link isCidrv4}/{@link isCidrv6} type guards are also
 * exported for working with version-polymorphic CIDR values.
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

import { cidrv4FromCidrv64Mapped } from "./4to6.ts";
import { isIpv6Ipv4Mapped } from "./classifyv6.ts";
import {
  type Cidrv4,
  cidrv4Addresses,
  cidrv4ContainsCidr,
  cidrv4Intersect,
  cidrv4Merge,
  cidrv4Overlaps,
  cidrv4Size,
  cidrv4Subtract,
  parseCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";
import {
  type Cidrv6,
  cidrv6Addresses,
  cidrv6ContainsCidr,
  cidrv6Intersect,
  cidrv6Merge,
  cidrv6Overlaps,
  cidrv6Size,
  cidrv6Subtract,
  parseCidrv6,
  stringifyCidrv6,
} from "./cidrv6.ts";

export type { Cidrv4 } from "./cidrv4.ts";
export type { Cidrv6 } from "./cidrv6.ts";

/**
 * A CIDR block of either IP version.
 *
 * This is a union of {@link Cidrv4} and {@link Cidrv6}, useful for functions
 * that operate on CIDR blocks regardless of IP version. Use the
 * {@link isCidrv4} and {@link isCidrv6} type guards to narrow.
 */
export type Cidr = Cidrv4 | Cidrv6;

/**
 * Type guard that checks whether a {@link Cidr} is an IPv4 CIDR block.
 *
 * @param cidr The CIDR block to check
 * @returns `true` if the CIDR is a {@link Cidrv4}
 *
 * @example
 * ```ts
 * import { assert } from "@std/assert";
 * import { isCidrv4, parseCidr } from "@hertzg/ip/cidr";
 *
 * assert(isCidrv4(parseCidr("10.0.0.0/8")));
 * ```
 */
export function isCidrv4(cidr: Cidr): cidr is Cidrv4 {
  return typeof cidr.address === "number";
}

/**
 * Type guard that checks whether a {@link Cidr} is an IPv6 CIDR block.
 *
 * @param cidr The CIDR block to check
 * @returns `true` if the CIDR is a {@link Cidrv6}
 *
 * @example
 * ```ts
 * import { assert } from "@std/assert";
 * import { isCidrv6, parseCidr } from "@hertzg/ip/cidr";
 *
 * assert(isCidrv6(parseCidr("2001:db8::/32")));
 * ```
 */
export function isCidrv6(cidr: Cidr): cidr is Cidrv6 {
  return typeof cidr.address === "bigint";
}

/**
 * Parses an IPv4 or IPv6 CIDR notation string.
 *
 * Detects the IP version by checking for `:` in the input — if present,
 * the CIDR is parsed as IPv6 (returning {@link Cidrv6}), otherwise as IPv4
 * (returning {@link Cidrv4}). IPv4-mapped IPv6 CIDRs with prefix length >= 96
 * (e.g., `::ffff:192.168.1.0/120`) are automatically unwrapped to their
 * IPv4 CIDR representation.
 *
 * To preserve the full IPv6 CIDR for mapped addresses, use
 * {@link parseCidrv6} directly instead.
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
 *
 * const mapped = parseCidr("::ffff:192.168.1.0/120");
 * assertEquals(mapped, { address: 3232235776, prefixLength: 24 });
 * ```
 */
export function parseCidr(cidr: string): Cidr {
  if (cidr.includes(":")) {
    const v6 = parseCidrv6(cidr);
    if (isIpv6Ipv4Mapped(v6.address) && v6.prefixLength >= 96) {
      return cidrv4FromCidrv64Mapped(v6);
    }
    return v6;
  }
  return parseCidrv4(cidr);
}

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
export function stringifyCidr(cidr: Cidr): string {
  if (isCidrv6(cidr)) {
    return stringifyCidrv6(cidr);
  }
  return stringifyCidrv4(cidr);
}

/**
 * Checks if one CIDR block fully contains another.
 *
 * Dispatches to {@link cidrv4ContainsCidr} or {@link cidrv6ContainsCidr}
 * based on the address type. Throws {@link TypeError} when mixing
 * IPv4 and IPv6 CIDRs.
 *
 * @param outer The CIDR block that may contain the other
 * @param inner The CIDR block that may be contained
 * @returns true if every address in `inner` is within `outer`, false otherwise
 * @throws {TypeError} If the two CIDRs are different IP versions
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
 * @example Mixed versions throw TypeError
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrContainsCidr, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertThrows(
 *   () => cidrContainsCidr(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
 *   TypeError,
 * );
 * assertThrows(
 *   () => cidrContainsCidr(parseCidr("2001:db8::/32"), parseCidr("10.0.0.0/8")),
 *   TypeError,
 * );
 * ```
 */
export function cidrContainsCidr<T extends Cidr>(
  outer: T,
  inner: T,
): boolean;
export function cidrContainsCidr(outer: Cidr, inner: Cidr): boolean {
  if (isCidrv6(outer) && isCidrv6(inner)) {
    return cidrv6ContainsCidr(outer, inner);
  } else if (isCidrv4(outer) && isCidrv4(inner)) {
    return cidrv4ContainsCidr(outer, inner);
  }

  throw new TypeError(
    "Cannot compare containment of IPv4 and IPv6 CIDR blocks",
  );
}

/**
 * Checks if two CIDR blocks overlap (share at least one address).
 *
 * Dispatches to {@link cidrv4Overlaps} or {@link cidrv6Overlaps}
 * based on the address type. Throws {@link TypeError} when mixing
 * IPv4 and IPv6 CIDRs.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns true if the two CIDR ranges share at least one address, false otherwise
 * @throws {TypeError} If the two CIDRs are different IP versions
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
 * @example Mixed versions throw TypeError
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { cidrOverlaps, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertThrows(
 *   () => cidrOverlaps(parseCidr("10.0.0.0/8"), parseCidr("2001:db8::/32")),
 *   TypeError,
 * );
 * assertThrows(
 *   () => cidrOverlaps(parseCidr("::/0"), parseCidr("0.0.0.0/0")),
 *   TypeError,
 * );
 * ```
 */
export function cidrOverlaps<T extends Cidr>(
  a: T,
  b: T,
): boolean;
export function cidrOverlaps(a: Cidr, b: Cidr): boolean {
  if (isCidrv6(a) && isCidrv6(b)) {
    return cidrv6Overlaps(a, b);
  } else if (isCidrv4(a) && isCidrv4(b)) {
    return cidrv4Overlaps(a, b);
  }

  throw new TypeError("Cannot check overlap of IPv4 and IPv6 CIDR blocks");
}

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
 *
 * const result = cidrIntersect(parseCidr("10.0.0.0/8"), parseCidr("10.1.0.0/16"));
 * assertEquals(result && stringifyCidr(result), "10.1.0.0/16");
 * ```
 *
 * @example IPv6 intersection
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrIntersect, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * const result = cidrIntersect(parseCidr("2001:db8::/32"), parseCidr("2001:db8:1::/48"));
 * assertEquals(result && stringifyCidr(result), "2001:db8:1::/48");
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
export function cidrIntersect<T extends Cidr>(
  a: T,
  b: T,
): T | null;
export function cidrIntersect(a: Cidr, b: Cidr): Cidr | null {
  if (isCidrv6(a) && isCidrv6(b)) {
    return cidrv6Intersect(a, b);
  } else if (isCidrv4(a) && isCidrv4(b)) {
    return cidrv4Intersect(a, b);
  }
  throw new TypeError("Cannot intersect IPv4 and IPv6 CIDR blocks");
}

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
 *
 * const result = cidrSubtract(parseCidr("10.0.0.0/24"), parseCidr("172.16.0.0/24"));
 * assertEquals(result.map((c) => stringifyCidr(c)), ["10.0.0.0/24"]);
 * ```
 *
 * @example IPv6 subtraction
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrSubtract, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * const result = cidrSubtract(parseCidr("2001:db8::/32"), parseCidr("2001:db9::/32"));
 * assertEquals(result.map((c) => stringifyCidr(c)), ["2001:db8::/32"]);
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
export function cidrSubtract<T extends Cidr>(
  a: T,
  b: T,
): T[];
export function cidrSubtract(a: Cidr, b: Cidr): Cidr[] {
  if (isCidrv6(a) && isCidrv6(b)) {
    return cidrv6Subtract(a, b);
  } else if (isCidrv4(a) && isCidrv4(b)) {
    return cidrv4Subtract(a, b);
  }

  throw new TypeError("Cannot subtract IPv4 and IPv6 CIDR blocks");
}

/**
 * Merges CIDR blocks into the minimal covering set.
 *
 * Dispatches to {@link cidrv4Merge} or {@link cidrv6Merge} based on the
 * address type of the first element. All elements must be the same IP
 * version.
 *
 * @param cidrs The CIDR blocks to merge
 * @returns Minimal set of non-overlapping CIDR blocks, sorted by address
 *
 * @example Merge IPv4 CIDRs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrMerge, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * const result = cidrMerge([parseCidr("10.0.0.0/25"), parseCidr("10.0.0.128/25")]);
 * assertEquals(result.map((c) => stringifyCidr(c)), ["10.0.0.0/24"]);
 * ```
 *
 * @example Merge IPv6 CIDRs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrMerge, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * const result = cidrMerge([parseCidr("2001:db8::/33"), parseCidr("2001:db8:8000::/33")]);
 * assertEquals(result.map((c) => stringifyCidr(c)), ["2001:db8::/32"]);
 * ```
 *
 * @example Empty array returns empty
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrMerge } from "@hertzg/ip/cidr";
 *
 * assertEquals(cidrMerge([]), []);
 * ```
 */
export function cidrMerge<T extends Cidr>(
  cidrs: readonly T[],
): T[];
export function cidrMerge(cidrs: readonly Cidr[]): Cidr[] {
  if (cidrs.length === 0) {
    return [];
  }

  if (cidrs.every(isCidrv6)) {
    return cidrv6Merge(cidrs);
  } else if (cidrs.every(isCidrv4)) {
    return cidrv4Merge(cidrs);
  }

  throw new TypeError("All CIDRs must be the same IP version");
}

/**
 * Returns the total number of addresses in a CIDR block.
 *
 * Dispatches to {@link cidrv4Size} or {@link cidrv6Size} based on the
 * address type.
 *
 * @param cidr The CIDR block
 * @returns The total number of addresses (number for IPv4, bigint for IPv6)
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrSize, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(cidrSize(parseCidr("192.168.1.0/24")), 256);
 * assertEquals(cidrSize(parseCidr("fd00::/120")), 256n);
 * ```
 */
export function cidrSize<T extends Cidr>(
  cidr: T,
): T extends Cidrv6 ? bigint : number;
export function cidrSize(cidr: Cidr): number | bigint {
  if (isCidrv6(cidr)) {
    return cidrv6Size(cidr);
  }
  return cidrv4Size(cidr);
}

/** Generates all addresses in an IPv4 CIDR block. */
export function cidrAddresses(
  cidr: Cidrv4,
  options?: { offset?: number; count?: number; step?: number },
): Generator<number>;
/** Generates all addresses in an IPv6 CIDR block. */
export function cidrAddresses(
  cidr: Cidrv6,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<bigint>;
/**
 * Generates IP addresses within a CIDR block.
 *
 * Dispatches to {@link cidrv4Addresses} or {@link cidrv6Addresses} based on
 * the address type. Yields addresses lazily for memory-efficient iteration.
 *
 * @param cidr The CIDR block to enumerate
 * @param options Optional offset, count, and step parameters
 * @returns A generator yielding addresses (number for IPv4, bigint for IPv6)
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrAddresses, parseCidr } from "@hertzg/ip/cidr";
 * import { stringifyIp } from "@hertzg/ip/ip";
 *
 * const first3 = Array.from(cidrAddresses(parseCidr("10.0.0.0/29"), { count: 3 }));
 * assertEquals(first3.map(stringifyIp), [
 *   "10.0.0.0", "10.0.0.1", "10.0.0.2",
 * ]);
 * ```
 */
export function cidrAddresses(
  cidr: Cidr,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<number | bigint>;
export function* cidrAddresses(
  cidr: Cidr,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<number | bigint> {
  if (isCidrv6(cidr)) {
    yield* cidrv6Addresses(cidr, options);
  } else {
    yield* cidrv4Addresses(
      cidr,
      options as {
        offset?: number;
        count?: number;
        step?: number;
      },
    );
  }
}
