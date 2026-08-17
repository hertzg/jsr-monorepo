/**
 * IPv6 address parsing and stringifying utilities.
 *
 * This module provides functions to convert between IPv6 colon-hexadecimal
 * notation and bigint representation, enabling arithmetic operations on
 * IP addresses.
 *
 * @example Basic IPv6 operations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const { address } = parseAddressv6("2001:db8::1");
 * assertEquals(address, 42540766411282592856903984951653826561n);
 *
 * const next = address + 1n;
 * assertEquals(stringifyAddressv6(next), "2001:db8::2");
 * ```
 *
 * @example Zone IDs are carried, not applied
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const linkLocal = parseAddressv6("fe80::1%eth0");
 * assertEquals(linkLocal, { address: 0xfe800000000000000000000000000001n, zoneId: "eth0" });
 * assertEquals(stringifyAddressv6(linkLocal), "fe80::1%eth0");
 * assertEquals(stringifyAddressv6(linkLocal.address), "fe80::1");
 * ```
 *
 * @example Bitwise operations on IPv6 addresses
 *
 * Since IPv6 addresses are plain bigints, you can use standard JavaScript
 * bitwise operators directly. For NOT, mask the result with the maximum
 * 128-bit value to stay within range.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const ip = parseAddressv6("2001:db8::1").address;
 * const MAX_IPV6 = (1n << 128n) - 1n;
 *
 * // Bitwise NOT (invert all bits, mask to 128 bits)
 * const inverted = ~ip & MAX_IPV6;
 * assertEquals(stringifyAddressv6(inverted), "dffe:f247:ffff:ffff:ffff:ffff:ffff:fffe");
 *
 * // Bitwise AND (apply network mask to get network address)
 * const mask = (MAX_IPV6 << 96n) & MAX_IPV6; // /32 mask
 * const network = ip & mask;
 * assertEquals(stringifyAddressv6(network), "2001:db8::");
 *
 * // Bitwise OR (set host bits)
 * const result = network | 0xFFn;
 * assertEquals(stringifyAddressv6(result), "2001:db8::ff");
 *
 * // Direct comparison (no isEqual() needed)
 * assertEquals(parseAddressv6("::1").address === parseAddressv6("::1").address, true);
 * assertEquals(parseAddressv6("::1").address === parseAddressv6("::2").address, false);
 * ```
 *
 * @module
 */

import { type Addressv4, parseAddressv4 } from "./addressv4.ts";
import { splitNotation, type ZoneId } from "./notation.ts";

export type {
  /** An IPv4 address as a 32-bit unsigned integer. */
  Addressv4,
} from "./addressv4.ts";
export type {
  /** The zone ID after `%`, a string. */
  ZoneId,
} from "./notation.ts";

/**
 * An IPv6 address as a 128-bit unsigned bigint, `0n` to `2n ** 128n - 1n`.
 * The primitive type is what carries the version: a `bigint` is IPv6, a
 * `number` is IPv4 (ADR 0001).
 */
export type Addressv6 = bigint;

/**
 * What {@link parseAddressv6} returns and what {@link stringifyAddressv6}
 * accepts: the address, plus the zone ID if the notation had one. Read
 * `.address` for the bare {@link Addressv6}; the zone never touches the
 * value, and no operation in this package reads it.
 */
export type ParsedAddressv6 = {
  /** The address as a 128-bit unsigned bigint */
  readonly address: Addressv6;
  /** The zone ID after `%`, verbatim, when the notation had one */
  readonly zoneId?: ZoneId;
};

/** Character codes the address scanner compares against. */
const CHAR_COLON = 0x3a;
const CHAR_DOT = 0x2e;

/** The value of one hex digit, or -1 for anything else. */
function hexDigit(code: number): number {
  if (code >= 0x30 && code <= 0x39) return code - 0x30; // "0".."9"
  if (code >= 0x61 && code <= 0x66) return code - 0x61 + 10; // "a".."f"
  if (code >= 0x41 && code <= 0x46) return code - 0x41 + 10; // "A".."F"
  return -1;
}

/**
 * Reads a bare IPv6 address slice, the layer-2 scanner of ADR 0003. The
 * slice holds neither `%` nor `/`; {@link splitNotation} took those off.
 */
function scanAddressv6(address: string): Addressv6 {
  const end = address.length;

  // Groups accumulate into `packed`, low group last. When "::" is reached the
  // groups written so far are lifted to the top of the 128 bits and kept in
  // `head`, which opens the zero run without a filler array; `packed` then
  // collects the groups written after it.
  let head = 0n;
  let packed = 0n;
  let groups = 0;
  let hasZeroRun = false;
  let index = 0;

  if (
    address.charCodeAt(0) === CHAR_COLON && address.charCodeAt(1) === CHAR_COLON
  ) {
    hasZeroRun = true;
    index = 2;
    if (index >= end) return 0n;
  }

  for (;;) {
    const start = index;
    let value = 0;

    while (index < end) {
      const digit = hexDigit(address.charCodeAt(index));
      if (digit < 0) break;
      value = value * 16 + digit;
      index++;
    }

    // A "." in the final field means the embedded IPv4 tail, which is handed
    // to parseAddressv4 whole -- including any over-long run of digits before it,
    // which is an octet rather than a hex group. A dotted field with a group
    // still to come is not a tail, and falls through to the group error.
    if (index < end && address.charCodeAt(index) === CHAR_DOT) {
      if (address.indexOf(":", index) === -1) {
        packed = (packed << 32n) |
          BigInt(parseAddressv4(address.slice(start, end)).address);
        groups += 2;
        break;
      }
    }

    const digits = index - start;
    if (
      digits === 0 || digits > 4 ||
      (index < end && address.charCodeAt(index) !== CHAR_COLON)
    ) {
      const colon = address.indexOf(":", index);
      throw new TypeError(
        `Invalid IPv6 group: '${
          address.slice(start, colon === -1 ? end : colon)
        }' (must be 1-4 hex digits)`,
      );
    }

    packed = (packed << 16n) | BigInt(value);
    groups++;
    // Bounds how far `packed` can grow before the count is reported below.
    if (groups > 8) {
      throw new TypeError(
        "IPv6 address must have exactly 8 groups (or use ::), got more than 8",
      );
    }

    if (index >= end) break;

    index++; // the ":" that ended the group
    if (index < end && address.charCodeAt(index) === CHAR_COLON) {
      if (hasZeroRun) {
        throw new TypeError("IPv6 address can only contain one '::'");
      }
      hasZeroRun = true;
      head = packed << BigInt(128 - 16 * groups);
      packed = 0n;
      index++;
      if (index >= end) break;
    }
  }

  if (!hasZeroRun) {
    if (groups !== 8) {
      throw new TypeError(
        `IPv6 address must have exactly 8 groups (or use ::), got ${groups}`,
      );
    }
    return packed;
  }

  if (groups >= 8) {
    throw new TypeError(
      `'::' must cover at least one group, so at most 7 may be written, got ${groups}`,
    );
  }

  return head | packed;
}

/**
 * Parses an IPv6 address in colon-hexadecimal notation, with an optional
 * zone ID, to its numeric value.
 *
 * The notation is `address [ "%" zoneId ]` (ADR 0003). The address grammar
 * is exactly RFC 4291 section 2.2 and nothing else:
 * - Full form: `2001:0db8:0000:0000:0000:0000:0000:0001`
 * - Compressed form with `::`: `2001:db8::1`
 * - Mixed IPv4 form: `::ffff:192.168.1.1`, the dotted quad only as the last field
 *
 * A group is 1-4 hex digits, with no `0x`, no sign and no trailing text;
 * `::` covers one or more groups, so at most seven may be written alongside
 * it; and whitespace is accepted nowhere, including around the whole
 * string. The zone ID, when present, is carried verbatim: it may not
 * contain `%`, `/` or whitespace, is never percent-decoded (`%25eth0` is the
 * zone `25eth0`), and never touches the numeric value.
 *
 * A prefix is not accepted; that is {@link parseCidrv6}'s slot. An
 * IPv4-mapped address stays a `bigint` here; {@link parseAddress} is the
 * parser that unmaps it.
 *
 * @param address The address string, colon-hexadecimal with an optional `%zoneId`
 * @returns The address as a 128-bit bigint, and the zone ID if there was one
 * @throws {TypeError} If the format is invalid -- including a group that is
 *   not 1-4 hex digits, more than one `::`, a `::` covering no groups,
 *   whitespace, the wrong number of groups, a prefix, an empty or malformed
 *   zone ID
 * @throws {RangeError} If an embedded IPv4 octet is out of range, as in
 *   `"::1.2.3.256"`. A malformed hex group is a `TypeError`, not this;
 *   a group cannot be numerically out of range, since 4 hex digits
 *   cannot exceed `ffff`.
 *
 * @example Basic parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(parseAddressv6("::"), { address: 0n });
 * assertEquals(parseAddressv6("::1"), { address: 1n });
 * assertEquals(parseAddressv6("2001:db8::1"), { address: 42540766411282592856903984951653826561n });
 * assertEquals(parseAddressv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"), { address: 340282366920938463463374607431768211455n });
 * ```
 *
 * @example Compressed forms
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(parseAddressv6("2001:db8::"), parseAddressv6("2001:0db8:0000:0000:0000:0000:0000:0000"));
 * assertEquals(parseAddressv6("::ffff:192.168.1.1"), parseAddressv6("0:0:0:0:0:ffff:c0a8:0101"));
 * ```
 *
 * @example A zone ID is carried verbatim
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(parseAddressv6("fe80::1%eth0"), { address: 0xfe800000000000000000000000000001n, zoneId: "eth0" });
 * assertEquals(parseAddressv6("fe80::1%12"), { address: 0xfe800000000000000000000000000001n, zoneId: "12" });
 * assertEquals(parseAddressv6("fe80::1%eth0.100"), { address: 0xfe800000000000000000000000000001n, zoneId: "eth0.100" });
 * assertEquals(parseAddressv6("fe80::1%25eth0"), { address: 0xfe800000000000000000000000000001n, zoneId: "25eth0" });
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertThrows(() => parseAddressv6("192.168.1.1"), TypeError);
 * assertThrows(() => parseAddressv6("2001:db8:::1"), TypeError);
 * assertThrows(() => parseAddressv6("2001:db8::1::1"), TypeError);
 * assertThrows(() => parseAddressv6("2001:gggg::1"), TypeError);
 * assertThrows(() => parseAddressv6("1:2:3:4:5:6:7:8::"), TypeError);
 * assertThrows(() => parseAddressv6("::1 "), TypeError);
 * assertThrows(() => parseAddressv6("fe80::1%"), TypeError);
 * assertThrows(() => parseAddressv6("fe80::1%eth0%1"), TypeError);
 * assertThrows(() => parseAddressv6("fe80::1/64"), TypeError);
 * ```
 */
export function parseAddressv6(address: string): ParsedAddressv6 {
  const slots = splitNotation(address);

  if (slots.prefix !== undefined) {
    throw new TypeError(
      `IPv6 address must not have a prefix, got '/${slots.prefix}'`,
    );
  }

  const value = scanAddressv6(slots.address);

  if (slots.zoneId === undefined) {
    return { address: value };
  }
  if (/\s/.test(slots.zoneId)) {
    throw new TypeError(
      `Zone ID must not contain whitespace, got '${slots.zoneId}'`,
    );
  }
  return { address: value, zoneId: slots.zoneId };
}

/**
 * Stringifies an IPv6 address to compressed colon-hexadecimal notation.
 *
 * The output uses the canonical compressed form (RFC 5952):
 * - Leading zeros in each group are omitted
 * - The longest run of consecutive all-zero groups is replaced with `::`
 * - If there are multiple runs of the same length, the first one is compressed
 *
 * Takes either the bare 128-bit bigint or a {@link ParsedAddressv6}; given
 * the latter, a truthy `zoneId` is appended after `%`, so
 * `stringifyAddressv6(parseAddressv6(s))` gives back `s` for every accepted
 * `s` in canonical form. `zoneId` must not contain `%`, `/` or whitespace:
 * a zone containing any of them cannot be written in RFC 4007 textual form
 * at all, because `%` is the delimiter, and the result would not re-parse.
 * If you are producing a URI, percent-encode it there (RFC 9844,
 * `[fe80::1%25eth0]`); this package does not apply that transform, since
 * `%25` is also a valid interface index 25.
 *
 * @param address The address as a 128-bit bigint, or a parse result
 * @returns The IPv6 address string in compressed colon-hexadecimal notation, `%zoneId` appended when there is one
 * @throws {RangeError} If the address is negative or greater than 2^128-1
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(stringifyAddressv6(0n), "::");
 * assertEquals(stringifyAddressv6(1n), "::1");
 * assertEquals(stringifyAddressv6(42540766411282592856903984951653826561n), "2001:db8::1");
 * ```
 *
 * @example Compression rules
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(stringifyAddressv6(0x20010db8000000000000000000000001n), "2001:db8::1");
 * assertEquals(stringifyAddressv6(0x20010db800000000000000000000abcdn), "2001:db8::abcd");
 * assertEquals(stringifyAddressv6(0x00010000000000000001000000000001n), "1::1:0:0:1");
 * ```
 *
 * @example A parse result round-trips, zone included
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(stringifyAddressv6(parseAddressv6("fe80::1%eth0")), "fe80::1%eth0");
 * assertEquals(stringifyAddressv6(parseAddressv6("2001:0db8:0000:0000:0000:0000:0000:0001")), "2001:db8::1");
 * assertEquals(stringifyAddressv6({ address: 1n, zoneId: "" }), "::1");
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertThrows(() => stringifyAddressv6(-1n), RangeError);
 * assertThrows(() => stringifyAddressv6(340282366920938463463374607431768211456n), RangeError);
 * ```
 */
export function stringifyAddressv6(
  address: Addressv6 | ParsedAddressv6,
): string {
  if (typeof address === "object") {
    const text = stringifyAddressv6(address.address);
    return address.zoneId ? `${text}%${address.zoneId}` : text;
  }

  if (address < 0n || address > 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) {
    throw new RangeError(
      `IPv6 value out of range: ${address} (must be 0 to 2^128-1)`,
    );
  }

  // Extract 8 groups of 16 bits each
  const groups: number[] = [];
  for (let i = 0; i < 8; i++) {
    const group = Number((address >> BigInt((7 - i) * 16)) & 0xFFFFn);
    groups.push(group);
  }

  // Find the longest run of consecutive zeros
  let bestStart = -1;
  let bestLen = 0;
  let currentStart = -1;
  let currentLen = 0;

  for (let i = 0; i < 8; i++) {
    if (groups[i] === 0) {
      if (currentStart === -1) {
        currentStart = i;
        currentLen = 1;
      } else {
        currentLen++;
      }
    } else {
      if (currentLen > bestLen) {
        bestStart = currentStart;
        bestLen = currentLen;
      }
      currentStart = -1;
      currentLen = 0;
    }
  }
  if (currentLen > bestLen) {
    bestStart = currentStart;
    bestLen = currentLen;
  }

  // Build the string
  if (bestLen > 1) {
    // Compress the longest run of zeros
    const left = groups.slice(0, bestStart)
      .map((g) => g.toString(16))
      .join(":");
    const right = groups.slice(bestStart + bestLen)
      .map((g) => g.toString(16))
      .join(":");

    if (left === "" && right === "") {
      return "::";
    } else if (left === "") {
      return "::" + right;
    } else if (right === "") {
      return left + "::";
    } else {
      return left + "::" + right;
    }
  } else {
    // No compression possible
    return groups.map((g) => g.toString(16)).join(":");
  }
}

/**
 * Stringifies an IPv6 address to full uncompressed colon-hexadecimal
 * notation.
 *
 * Every one of the 8 groups is written with all 4 hex digits, and no run of
 * zero groups is replaced with `::`. This is the counterpart of
 * {@link stringifyAddressv6}, which produces the canonical compressed form.
 * To expand a string, parse it first: `stringifyAddressv6Expanded(parseAddressv6(s))`.
 *
 * Takes either the bare 128-bit bigint or a {@link ParsedAddressv6}; given
 * the latter, a truthy `zoneId` is appended after `%`. The zone constraint
 * of {@link stringifyAddressv6} applies: no `%`, `/` or whitespace.
 *
 * @param address The address as a 128-bit bigint, or a parse result
 * @returns The IPv6 address string with all 8 groups written in full, `%zoneId` appended when there is one
 * @throws {RangeError} If the address is negative or greater than 2^128-1
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyAddressv6Expanded } from "@hertzg/ip/addressv6";
 *
 * assertEquals(stringifyAddressv6Expanded(0n), "0000:0000:0000:0000:0000:0000:0000:0000");
 * assertEquals(stringifyAddressv6Expanded(1n), "0000:0000:0000:0000:0000:0000:0000:0001");
 * assertEquals(stringifyAddressv6Expanded(42540766411282592856903984951653826561n), "2001:0db8:0000:0000:0000:0000:0000:0001");
 * ```
 *
 * @example Expanding a string, zone included
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, stringifyAddressv6, stringifyAddressv6Expanded } from "@hertzg/ip/addressv6";
 *
 * const address = parseAddressv6("2001:db8::1");
 * assertEquals(stringifyAddressv6(address), "2001:db8::1");
 * assertEquals(stringifyAddressv6Expanded(address), "2001:0db8:0000:0000:0000:0000:0000:0001");
 * assertEquals(
 *   stringifyAddressv6Expanded(parseAddressv6("fe80::1%eth0")),
 *   "fe80:0000:0000:0000:0000:0000:0000:0001%eth0",
 * );
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyAddressv6Expanded } from "@hertzg/ip/addressv6";
 *
 * assertThrows(() => stringifyAddressv6Expanded(-1n), RangeError);
 * assertThrows(() => stringifyAddressv6Expanded(340282366920938463463374607431768211456n), RangeError);
 * ```
 */
export function stringifyAddressv6Expanded(
  address: Addressv6 | ParsedAddressv6,
): string {
  if (typeof address === "object") {
    const text = stringifyAddressv6Expanded(address.address);
    return address.zoneId ? `${text}%${address.zoneId}` : text;
  }

  if (address < 0n || address > 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) {
    throw new RangeError(
      `IPv6 value out of range: ${address} (must be 0 to 2^128-1)`,
    );
  }

  const hex = address.toString(16).padStart(32, "0");

  return `${hex.slice(0, 4)}:${hex.slice(4, 8)}:${hex.slice(8, 12)}:${
    hex.slice(12, 16)
  }:${hex.slice(16, 20)}:${hex.slice(20, 24)}:${hex.slice(24, 28)}:${
    hex.slice(28, 32)
  }`;
}

/**
 * Compares two IPv6 addresses for sorting, numerically ascending.
 *
 * Suitable as an `Array.prototype.sort` / `toSorted` comparator. For a
 * comparator that also accepts IPv4 addresses, see {@link compareAddress}, which
 * sorts every IPv4 address before every IPv6 one.
 *
 * IPv4-mapped addresses (`::ffff:x.x.x.x`) are ordinary IPv6 values here —
 * they sort by their 128-bit value, inside the `::ffff:0:0/96` block.
 *
 * @param a The first address
 * @param b The second address
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort addresses numerically, not lexicographically
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddressv6, parseAddressv6, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const addresses = ["2001:db8::9", "2001:db8::10", "2001:db8::2"].map((s) => parseAddressv6(s).address);
 *
 * assertEquals(addresses.toSorted(compareAddressv6).map(stringifyAddressv6), [
 *   "2001:db8::2",
 *   "2001:db8::9",
 *   "2001:db8::10",
 * ]);
 * ```
 *
 * @example The three possible results
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddressv6, parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(compareAddressv6(parseAddressv6("::1").address, parseAddressv6("::2").address), -1);
 * assertEquals(compareAddressv6(parseAddressv6("::2").address, parseAddressv6("::1").address), 1);
 * assertEquals(compareAddressv6(parseAddressv6("::1").address, parseAddressv6("::1").address), 0);
 * ```
 */
export function compareAddressv6(a: Addressv6, b: Addressv6): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

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
 * @param address The address as a 32-bit unsigned integer
 * @returns The IPv4-mapped IPv6 address as a 128-bit bigint
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mapFromAddressv4, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(
 *   stringifyAddressv6(mapFromAddressv4(parseAddressv4("192.168.1.1").address)),
 *   "::ffff:c0a8:101",
 * );
 * assertEquals(
 *   stringifyAddressv6(mapFromAddressv4(parseAddressv4("127.0.0.1").address)),
 *   "::ffff:7f00:1",
 * );
 * assertEquals(
 *   stringifyAddressv6(mapFromAddressv4(parseAddressv4("0.0.0.0").address)),
 *   "::ffff:0:0",
 * );
 * ```
 */
export function mapFromAddressv4(address: Addressv4): Addressv6 {
  return IPV4_MAPPED_PREFIX | BigInt(address);
}

/**
 * Extracts the IPv4 address from an IPv4-mapped IPv6 address.
 *
 * Takes a 128-bit IPv4-mapped IPv6 address (`::ffff:x.x.x.x`) and returns
 * the embedded 32-bit IPv4 address as defined in
 * {@link https://www.rfc-editor.org/rfc/rfc4291#section-2.5.5.2 | RFC 4291 Section 2.5.5.2}.
 *
 * @param address The IPv4-mapped address as a 128-bit bigint
 * @returns The extracted IPv4 address as a 32-bit unsigned integer
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, unmapToAddressv4 } from "@hertzg/ip/addressv6";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(
 *   stringifyAddressv4(unmapToAddressv4(parseAddressv6("::ffff:192.168.1.1").address)),
 *   "192.168.1.1",
 * );
 * assertEquals(
 *   stringifyAddressv4(unmapToAddressv4(parseAddressv6("::ffff:c0a8:101").address)),
 *   "192.168.1.1",
 * );
 * assertEquals(
 *   stringifyAddressv4(unmapToAddressv4(parseAddressv6("::ffff:0.0.0.0").address)),
 *   "0.0.0.0",
 * );
 * ```
 */
export function unmapToAddressv4(address: Addressv6): Addressv4 {
  return Number(address & IPV4_MASK);
}
