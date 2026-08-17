/**
 * Universal CIDR notation parsing, stringifying, and validation.
 *
 * This module provides {@link parseCidr}, {@link stringifyCidr},
 * {@link cidrContains}, {@link cidrContainsCidr}, {@link cidrOverlaps},
 * {@link cidrIntersect}, {@link cidrSubtract}, {@link cidrMerge},
 * {@link cidrSize}, {@link cidrFirstAddress}, {@link cidrLastAddress},
 * {@link cidrAddresses}, and {@link compareCidr} that auto-detect IPv4 vs
 * IPv6 and delegate to the appropriate version-specific function. The
 * {@link Cidr} and {@link ParsedCidr} type aliases and the
 * {@link isCidrv4}/{@link isCidrv6} type guards are also exported for
 * working with version-polymorphic CIDR values.
 *
 * For version-specific functions, see:
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): {@link parseCidrv4}, {@link stringifyCidrv4}, {@link isValidCidrv4}, {@link compareCidrv4}
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): {@link parseCidrv6}, {@link stringifyCidrv6}, {@link isValidCidrv6}, {@link compareCidrv6}
 *
 * @example Parse and stringify any CIDR block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * // IPv4
 * const v4 = parseCidr("192.168.1.0/24");
 * assertEquals(v4, { address: 3232235776, prefixLength: 24 });
 * assertEquals(stringifyCidr(v4), "192.168.1.0/24");
 *
 * // IPv6, with a zone ID
 * const v6 = parseCidr("fe80::%ether1/64");
 * assertEquals(v6, { address: 0xfe80n << 112n, prefixLength: 64, zoneId: "ether1" });
 * assertEquals(stringifyCidr(v6), "fe80::%ether1/64");
 *
 * // The mask dialect is kept as written
 * const masked = parseCidr("10.0.0.0/255.0.0.0");
 * assertEquals(masked, { address: 167772160, mask: 0xFF000000 });
 * assertEquals(stringifyCidr(masked), "10.0.0.0/255.0.0.0");
 * ```
 *
 * @module
 */

import {
  type Cidrv4,
  cidrv4Addresses,
  cidrv4Contains,
  cidrv4ContainsCidr,
  cidrv4FirstAddress,
  cidrv4Intersect,
  cidrv4LastAddress,
  cidrv4Merge,
  cidrv4Overlaps,
  cidrv4Size,
  cidrv4Subtract,
  compareCidrv4,
  parseCidrv4,
  type ParsedCidrv4,
  stringifyCidrv4,
} from "./cidrv4.ts";
import {
  type Cidrv6,
  cidrv6Addresses,
  cidrv6Contains,
  cidrv6ContainsCidr,
  cidrv6FirstAddress,
  cidrv6Intersect,
  cidrv6LastAddress,
  cidrv6Merge,
  cidrv6Overlaps,
  cidrv6Size,
  cidrv6Subtract,
  compareCidrv6,
  parseCidrv6,
  type ParsedCidrv6,
  stringifyCidrv6,
  unmapToCidrv4,
} from "./cidrv6.ts";
import type {
  Address,
  ParsedAddress,
  ParsedAddressv4,
  ParsedAddressv6,
  ParseOptions,
} from "./address.ts";
import type { Maskv4 } from "./cidrv4.ts";
import type { Maskv6 } from "./cidrv6.ts";
import { splitNotation } from "./notation.ts";

export type {
  /** A plain IP address of either IP version. */
  Address,
  /** An IPv4 address as a 32-bit unsigned integer. */
  Addressv4,
  /** An IPv6 address as a 128-bit unsigned bigint. */
  Addressv6,
  /** What parseAddress returns: the address and an optional zone ID. */
  ParsedAddress,
  /** What parseAddressv4 returns: the address and an optional zone ID. */
  ParsedAddressv4,
  /** What parseAddressv6 returns: the address and an optional zone ID. */
  ParsedAddressv6,
  /** Options for the universal parsers. */
  ParseOptions,
} from "./address.ts";
export type {
  /** The zone ID after `%`, a string. */
  ZoneId,
} from "./notation.ts";
export type {
  /** Type representing an IPv4 CIDR block, in either dialect. */
  Cidrv4,
  /** An IPv4 CIDR block written with a network mask. */
  MaskedCidrv4,
  /** An IPv4 network mask as a 32-bit unsigned integer. */
  Maskv4,
  /** What parseCidrv4 returns: a Cidrv4 and an optional zone ID. */
  ParsedCidrv4,
  /** An IPv4 CIDR block written with a prefix length. */
  PrefixedCidrv4,
  /** An IPv4 prefix length, 0 to 32. */
  PrefixLengthv4,
} from "./cidrv4.ts";
export type {
  /** Type representing an IPv6 CIDR block, in either dialect. */
  Cidrv6,
  /** An IPv6 CIDR block written with a network mask. */
  MaskedCidrv6,
  /** An IPv6 network mask as a 128-bit unsigned bigint. */
  Maskv6,
  /** What parseCidrv6 returns: a Cidrv6 and an optional zone ID. */
  ParsedCidrv6,
  /** An IPv6 CIDR block written with a prefix length. */
  PrefixedCidrv6,
  /** An IPv6 prefix length, 0 to 128. */
  PrefixLengthv6,
} from "./cidrv6.ts";

/**
 * A CIDR block of either IP version.
 *
 * This is a union of {@link Cidrv4} and {@link Cidrv6}, useful for functions
 * that operate on CIDR blocks regardless of IP version. Use the
 * {@link isCidrv4} and {@link isCidrv6} type guards to narrow. Each half
 * is itself a union of the prefix-length and mask dialects, so a `Cidr`
 * has four shapes and every operation here accepts all of them.
 */
export type Cidr = Cidrv4 | Cidrv6;

/**
 * What {@link parseCidr} returns and what {@link stringifyCidr} accepts: a
 * {@link ParsedCidrv4} or a {@link ParsedCidrv6}, the block in the dialect
 * it was written in plus an optional zone ID. Assignable to {@link Cidr},
 * so a parse result goes straight into every `cidr*` operation; none of
 * them reads the zone.
 */
export type ParsedCidr = ParsedCidrv4 | ParsedCidrv6;

/**
 * A network mask of either IP version: a `number` for IPv4, a `bigint`
 * for IPv6, the same split as {@link Address}.
 */
export type Mask = Maskv4 | Maskv6;

/**
 * A prefix length of either IP version. Being a bare `number` it cannot
 * say which version it belongs to, which is why there is no universal
 * mask-from-prefix-length function: `24` is `/24` in both, and the masks
 * differ.
 */
export type PrefixLength = number;

/**
 * Type guard that checks whether a {@link Cidr} is an IPv4 CIDR block.
 *
 * Reads the version off the address, so both dialects pass.
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
 * assert(isCidrv4({ address: 167772160, mask: 0xFF000000 }));
 * ```
 */
export function isCidrv4(cidr: Cidr): cidr is Cidrv4 {
  return typeof cidr.address === "number";
}

/**
 * Type guard that checks whether a {@link Cidr} is an IPv6 CIDR block.
 *
 * Reads the version off the address, so both dialects pass.
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
 * assert(isCidrv6({ address: 0x20010db8n << 96n, mask: 0xFFFFFFFF000000000000000000000000n }));
 * ```
 */
export function isCidrv6(cidr: Cidr): cidr is Cidrv6 {
  return typeof cidr.address === "bigint";
}

/** The IPv4-mapped block, `::ffff:0:0/96` (RFC 4291 section 2.5.5.2). */
const CIDR_IPV4_MAPPED: Cidrv6 = {
  address: 0xFFFF_0000_0000n,
  prefixLength: 96,
};

/**
 * Parses IPv4 or IPv6 CIDR notation, in either dialect and with an
 * optional zone ID.
 *
 * Detects the IP version from the address slot -- a `:` means IPv6,
 * otherwise IPv4 -- and hands the string to {@link parseCidrv6} or
 * {@link parseCidrv4}, so the accepted grammar is exactly theirs: an
 * address, an optional `%zoneId` carried verbatim, then `/` and a prefix
 * length or a mask of the same version.
 *
 * An IPv4-mapped IPv6 block is unmapped to an IPv4 block by default
 * (ADR 0004), but only when the whole `::ffff:0:0/96` prefix is fixed: a
 * prefix length of 96 or longer, or a mask whose high 96 bits are all ones.
 * The dialect is kept, the prefix length is reduced by 96 and a mask keeps
 * its low 32 bits, so `::ffff:192.168.1.0/120` becomes `192.168.1.0/24`.
 * `::ffff:1.2.3.4/64` is an IPv6 block that happens to start in the mapped
 * range and stays IPv6. Pass `{ unmapToV4: false }` to keep every IPv6
 * block, or use {@link parseCidrv6}, which never unmaps. The zone ID, if
 * any, is carried either way.
 *
 * @param cidr The CIDR notation string, e.g. `"192.168.1.0/24"`, `"2001:db8::/32"`, `"fe80::%ether1/64"`, `"10.0.0.0/255.0.0.0"`
 * @param options `unmapToV4`, default `true`
 * @returns The parsed CIDR as a {@link ParsedCidrv4} or {@link ParsedCidrv6}
 * @throws {TypeError} If the format is invalid, including a missing prefix and a mask of the other version
 * @throws {RangeError} If a well-formed number is out of range
 *
 * @example Both versions and both dialects
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(parseCidr("10.0.0.0/8"), { address: 167772160, prefixLength: 8 });
 * assertEquals(parseCidr("10.0.0.0/255.0.0.0"), { address: 167772160, mask: 0xFF000000 });
 * assertEquals(parseCidr("fe80::/10"), { address: 0xfe80n << 112n, prefixLength: 10 });
 * assertEquals(parseCidr("fe80::%ether1/64"), { address: 0xfe80n << 112n, prefixLength: 64, zoneId: "ether1" });
 * ```
 *
 * @example IPv4-mapped blocks unmap at /96 or longer
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(parseCidr("::ffff:192.168.1.0/120"), { address: 3232235776, prefixLength: 24 });
 * assertEquals(parseCidr("::ffff:192.168.1.0/96"), { address: 3232235776, prefixLength: 0 });
 * assertEquals(
 *   parseCidr("::ffff:192.168.1.0/ffff:ffff:ffff:ffff:ffff:ffff:ffff:ff00"),
 *   { address: 3232235776, mask: 0xFFFFFF00 },
 * );
 * assertEquals(parseCidr("::ffff:192.168.1.0/64"), { address: 0xffffc0a80100n, prefixLength: 64 });
 * assertEquals(
 *   parseCidr("::ffff:192.168.1.0/120", { unmapToV4: false }),
 *   { address: 0xffffc0a80100n, prefixLength: 120 },
 * );
 * ```
 *
 * @example An address alone is not a CIDR block
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseCidr } from "@hertzg/ip/cidr";
 *
 * assertThrows(() => parseCidr("10.0.0.1"), TypeError);
 * assertThrows(() => parseCidr("fe80::1%eth0"), TypeError);
 * ```
 */
export function parseCidr(cidr: string, options?: ParseOptions): ParsedCidr {
  if (!splitNotation(cidr).address.includes(":")) {
    return parseCidrv4(cidr);
  }
  // A block unmaps only when it lies inside the mapped /96 (ADR 0004): a
  // prefix length of 96 or longer, or a mask whose high 96 bits are ones.
  const parsed = parseCidrv6(cidr);
  if (
    options?.unmapToV4 === false ||
    !cidrv6ContainsCidr(CIDR_IPV4_MAPPED, parsed)
  ) {
    return parsed;
  }
  const unmapped = unmapToCidrv4(parsed);
  return parsed.zoneId === undefined
    ? unmapped
    : { ...unmapped, zoneId: parsed.zoneId };
}

/**
 * Stringifies a CIDR block of either version, or an address, to CIDR
 * notation.
 *
 * Dispatches on the version of the address and hands the value to
 * {@link stringifyCidrv4} or {@link stringifyCidrv6}, so their rules apply:
 * the dialect is preserved (`/N` for a prefixed block, `/mask` in the
 * address notation of its version for a masked one), a bare address gets
 * the noun's default (`/32` or `/128`), and a truthy `zoneId` is written
 * between the address and the `/`, so `stringifyCidr(parseCidr(s))` gives
 * back `s` for every accepted `s` in canonical form. `zoneId` must not
 * contain `%`, `/` or whitespace; see {@link stringifyCidrv6}.
 *
 * @param cidr The CIDR block in either dialect, a parse result, or a bare or parsed address
 * @returns The CIDR notation string
 * @throws {RangeError} If the address, or a mask, is out of range for its version
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(stringifyCidr(parseCidr("192.168.1.0/24")), "192.168.1.0/24");
 * assertEquals(stringifyCidr(parseCidr("2001:db8::/32")), "2001:db8::/32");
 * assertEquals(stringifyCidr(parseCidr("fe80::%ether1/64")), "fe80::%ether1/64");
 * ```
 *
 * @example Masked blocks are written with their mask
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(
 *   stringifyCidr({ address: 167772160, mask: 0xFF000000 }),
 *   "10.0.0.0/255.0.0.0",
 * );
 * assertEquals(
 *   stringifyCidr({ address: 0xfe80n << 112n, mask: 0xFFFFFFFF000000000000000000000000n }),
 *   "fe80::/ffff:ffff::",
 * );
 * ```
 *
 * @example A bare address gets the noun's default
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(stringifyCidr(3232235777), "192.168.1.1/32");
 * assertEquals(stringifyCidr(0xfe800000000000000000000000000001n), "fe80::1/128");
 * assertEquals(
 *   stringifyCidr({ address: 0xfe800000000000000000000000000001n, zoneId: "eth0" }),
 *   "fe80::1%eth0/128",
 * );
 * ```
 */
export function stringifyCidr(
  cidr: Address | ParsedAddress | ParsedCidr,
): string {
  if (typeof cidr === "number") return stringifyCidrv4(cidr);
  if (typeof cidr === "bigint") return stringifyCidrv6(cidr);
  // Narrowing a union by the type of one field is beyond `typeof`, hence
  // the casts; the runtime check is the same one isCidrv6 makes.
  return typeof cidr.address === "bigint"
    ? stringifyCidrv6(cidr as ParsedAddressv6 | ParsedCidrv6)
    : stringifyCidrv4(cidr as ParsedAddressv4 | ParsedCidrv4);
}

/**
 * Checks if a CIDR block contains an address.
 *
 * Dispatches to {@link cidrv4Contains} or {@link cidrv6Contains} based on the
 * address type. Unlike {@link cidrContainsCidr}, a version mismatch does not
 * throw — an IPv6 address is not contained in an IPv4 CIDR block, and the
 * reverse, so both return `false`. The address usually arrives from the
 * network while the CIDR comes from configuration, which makes a mismatch
 * ordinary traffic on a dual-stack listener rather than a caller mistake.
 *
 * IPv4-mapped IPv6 addresses are not converted here. {@link parseAddress} already
 * unwraps them, so an address from `parseAddress` matches an IPv4 CIDR; one from
 * {@link parseAddressv6} stays a `bigint` and does not.
 *
 * @param cidr The CIDR block that may contain the address
 * @param address The address to test for membership
 * @returns true if the address falls within the CIDR block, false otherwise
 *
 * @example IPv4 and IPv6 containment
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrContains, parseCidr } from "@hertzg/ip/cidr";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assert(cidrContains(parseCidr("10.0.0.0/8"), parseAddress("10.1.2.3").address));
 * assertEquals(cidrContains(parseCidr("10.0.0.0/8"), parseAddress("11.0.0.1").address), false);
 *
 * assert(cidrContains(parseCidr("2001:db8::/32"), parseAddress("2001:db8::1").address));
 * assertEquals(cidrContains(parseCidr("2001:db8::/32"), parseAddress("2001:db9::1").address), false);
 * ```
 *
 * @example Mixed versions return false instead of throwing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrContains, parseCidr } from "@hertzg/ip/cidr";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(cidrContains(parseCidr("10.0.0.0/8"), parseAddress("2001:db8::1").address), false);
 * assertEquals(cidrContains(parseCidr("::/0"), parseAddress("10.1.2.3").address), false);
 * ```
 *
 * @example IPv4-mapped IPv6 depends on which parser produced the address
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { cidrContains, parseCidr } from "@hertzg/ip/cidr";
 * import { parseAddress } from "@hertzg/ip/address";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assert(cidrContains(parseCidr("10.0.0.0/8"), parseAddress("::ffff:10.1.2.3").address));
 * assertEquals(
 *   cidrContains(parseCidr("10.0.0.0/8"), parseAddressv6("::ffff:10.1.2.3").address),
 *   false,
 * );
 * ```
 */
export function cidrContains(cidr: Cidr, address: Address): boolean {
  if (isCidrv6(cidr)) {
    return typeof address === "bigint" && cidrv6Contains(cidr, address);
  }
  return typeof address === "number" && cidrv4Contains(cidr, address);
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
  inner: T extends Cidrv4 ? Cidrv4 : Cidrv6,
): boolean;
/** Checks if one CIDR block fully contains another. */
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
 * @returns true if the two CIDR blocks share at least one address, false otherwise
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
  b: T extends Cidrv4 ? Cidrv4 : Cidrv6,
): boolean;
/** Checks if two CIDR blocks overlap (share at least one address). */
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
 * IPv4 and IPv6 CIDRs. The result matches the dialect of the inputs, and
 * is masked when they disagree (ADR 0006).
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
  b: T extends Cidrv4 ? Cidrv4 : Cidrv6,
): (T extends Cidrv4 ? Cidrv4 : Cidrv6) | null;
/** Returns the intersection of two CIDR blocks. */
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
 * IPv4 and IPv6 CIDRs. The result matches the dialect of the inputs, and
 * is masked when they disagree (ADR 0006).
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
  b: T extends Cidrv4 ? Cidrv4 : Cidrv6,
): (T extends Cidrv4 ? Cidrv4 : Cidrv6)[];
/** Subtracts one CIDR block from another. */
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
 * version. The result matches the dialect of the inputs, and is masked
 * when they disagree (ADR 0006).
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
/** Merges CIDR blocks into the minimal covering set. */
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
/** Returns the total number of addresses in a CIDR block. */
export function cidrSize(cidr: Cidr): number | bigint {
  if (isCidrv6(cidr)) {
    return cidrv6Size(cidr);
  }
  return cidrv4Size(cidr);
}

/**
 * Returns the first address of a CIDR block.
 *
 * Dispatches to {@link cidrv4FirstAddress} or {@link cidrv6FirstAddress}
 * based on the address type. Masking a non-canonical block through this is
 * the version-agnostic way to canonicalize it.
 *
 * There is deliberately no universal `cidrFirstUsableAddress`: the addresses
 * an operator may assign differ per version, and IPv6 has no library-wide
 * rule to apply. The usable-address vocabulary is IPv4-only — see
 * {@link https://jsr.io/@hertzg/ip/doc/cidrv4/~/cidrv4FirstUsableAddress | cidrv4FirstUsableAddress}.
 *
 * @param cidr The CIDR block
 * @returns The first address (number for IPv4, bigint for IPv6)
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrFirstAddress, parseCidr } from "@hertzg/ip/cidr";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * assertEquals(stringifyAddress(cidrFirstAddress(parseCidr("192.168.1.0/24"))), "192.168.1.0");
 * assertEquals(stringifyAddress(cidrFirstAddress(parseCidr("2001:db8::/32"))), "2001:db8::");
 * ```
 *
 * @example Sorting blocks by their first address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrFirstAddress, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * const blocks = [
 *   parseCidr("10.0.2.0/24"),
 *   parseCidr("10.0.0.0/24"),
 *   parseCidr("10.0.1.0/24"),
 * ];
 * blocks.sort((a, b) => Number(cidrFirstAddress(a)) - Number(cidrFirstAddress(b)));
 *
 * assertEquals(blocks.map(stringifyCidr), [
 *   "10.0.0.0/24",
 *   "10.0.1.0/24",
 *   "10.0.2.0/24",
 * ]);
 * ```
 */
export function cidrFirstAddress<T extends Cidr>(
  cidr: T,
): T extends Cidrv6 ? bigint : number;
/** Returns the first address of a CIDR block. */
export function cidrFirstAddress(cidr: Cidr): Address {
  if (isCidrv6(cidr)) {
    return cidrv6FirstAddress(cidr);
  }
  return cidrv4FirstAddress(cidr);
}

/**
 * Returns the last address of a CIDR block.
 *
 * Dispatches to {@link cidrv4LastAddress} or {@link cidrv6LastAddress} based
 * on the address type. Together with {@link cidrFirstAddress} this gives the
 * numeric bounds of a block without knowing its version — the pair sorting,
 * range comparison, and interval arithmetic want.
 *
 * Note the versions differ in what the last address *means*: for IPv4 it is
 * the directed broadcast address and is not assignable
 * ({@link https://jsr.io/@hertzg/ip/doc/cidrv4/~/cidrv4BroadcastAddress | cidrv4BroadcastAddress}),
 * while IPv6 has no broadcast address and the last address is assignable.
 *
 * @param cidr The CIDR block
 * @returns The last address (number for IPv4, bigint for IPv6)
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrLastAddress, parseCidr } from "@hertzg/ip/cidr";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * assertEquals(stringifyAddress(cidrLastAddress(parseCidr("192.168.1.0/24"))), "192.168.1.255");
 * assertEquals(stringifyAddress(cidrLastAddress(parseCidr("2001:db8::/120"))), "2001:db8::ff");
 * ```
 *
 * @example The bounds of a block, without knowing its version
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrFirstAddress, cidrLastAddress, parseCidr } from "@hertzg/ip/cidr";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * const v4 = parseCidr("10.0.0.0/29");
 * assertEquals(stringifyAddress(cidrFirstAddress(v4)), "10.0.0.0");
 * assertEquals(stringifyAddress(cidrLastAddress(v4)), "10.0.0.7");
 *
 * const v6 = parseCidr("fd00::/125");
 * assertEquals(stringifyAddress(cidrFirstAddress(v6)), "fd00::");
 * assertEquals(stringifyAddress(cidrLastAddress(v6)), "fd00::7");
 * ```
 */
export function cidrLastAddress<T extends Cidr>(
  cidr: T,
): T extends Cidrv6 ? bigint : number;
/** Returns the last address of a CIDR block. */
export function cidrLastAddress(cidr: Cidr): Address {
  if (isCidrv6(cidr)) {
    return cidrv6LastAddress(cidr);
  }
  return cidrv4LastAddress(cidr);
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
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * const first3 = Array.from(cidrAddresses(parseCidr("10.0.0.0/29"), { count: 3 }));
 * assertEquals(first3.map(stringifyAddress), [
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
): Generator<Address>;
/** Generates IP addresses within a CIDR block. */
export function* cidrAddresses(
  cidr: Cidr,
  options?: {
    offset?: number | bigint;
    count?: number | bigint;
    step?: number | bigint;
  },
): Generator<Address> {
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

/**
 * Compares two CIDR blocks of either version for sorting.
 *
 * The order is **version-first and total**: every {@link Cidrv4} sorts
 * before every {@link Cidrv6}, and within a version blocks sort by address
 * ascending, then by prefix length ascending — the shorter prefix (the
 * larger block) first. Mixed-version arguments are not an error: unlike the
 * other universal CIDR operations in this module, this function never
 * throws, because sorting a mixed list is the reason it exists. Ordering a
 * disjoint union needs no cross-version conversion — see ADR 0005.
 *
 * The block is ordered **as written**: the `address` field is compared as
 * stored, without applying the network mask first. See
 * {@link compareCidrv4} for what that means for blocks carrying host bits,
 * and for why both dialects are compared by mask.
 *
 * @param a The first CIDR block
 * @param b The second CIDR block
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort a mixed dual-stack allowlist
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidr, parseCidr, stringifyCidr } from "@hertzg/ip/cidr";
 *
 * const allowlist = [
 *   "2001:db8::/32",
 *   "192.168.1.0/24",
 *   "10.0.0.0/16",
 *   "fd00::/8",
 *   "10.0.0.0/8",
 * ].map((s) => parseCidr(s));
 *
 * assertEquals(allowlist.toSorted(compareCidr).map(stringifyCidr), [
 *   "10.0.0.0/8",
 *   "10.0.0.0/16",
 *   "192.168.1.0/24",
 *   "2001:db8::/32",
 *   "fd00::/8",
 * ]);
 * ```
 *
 * @example Mixed versions sort, they do not throw
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareCidr, parseCidr } from "@hertzg/ip/cidr";
 *
 * assertEquals(compareCidr(parseCidr("255.0.0.0/8"), parseCidr("::/0")), -1);
 * assertEquals(compareCidr(parseCidr("::/0"), parseCidr("0.0.0.0/0")), 1);
 * ```
 */
export function compareCidr(a: Cidr, b: Cidr): -1 | 0 | 1 {
  if (isCidrv4(a)) {
    return isCidrv4(b) ? compareCidrv4(a, b) : -1;
  }
  return isCidrv6(b) ? compareCidrv6(a, b) : 1;
}
