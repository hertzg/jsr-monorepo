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
 * const ip = parseAddressv6("2001:db8::1");
 * assertEquals(ip, 42540766411282592856903984951653826561n);
 *
 * const next = ip + 1n;
 * assertEquals(stringifyAddressv6(next), "2001:db8::2");
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
 * const ip = parseAddressv6("2001:db8::1");
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
 * assertEquals(parseAddressv6("::1") === parseAddressv6("::1"), true);
 * assertEquals(parseAddressv6("::1") === parseAddressv6("::2"), false);
 * ```
 *
 * @module
 */

import { parseAddressv4 } from "./addressv4.ts";

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
 * Parses an IPv6 address in colon-hexadecimal notation to a bigint.
 *
 * Supports standard IPv6 formats:
 * - Full form: `2001:0db8:0000:0000:0000:0000:0000:0001`
 * - Compressed form with `::`: `2001:db8::1`
 * - Mixed IPv4 form: `::ffff:192.168.1.1`
 * - Zone IDs are stripped: `fe80::1%eth0` becomes `fe80::1`
 *
 * The accepted grammar is exactly RFC 4291 section 2.2 and nothing else. A
 * group is 1-4 hex digits, with no `0x`, no sign and no trailing text; `::`
 * covers one or more groups, so at most seven may be written alongside it;
 * and whitespace is accepted nowhere, including around the whole string.
 *
 * @param address The address string in colon-hexadecimal notation
 * @returns The IPv6 address as a 128-bit bigint
 * @throws {TypeError} If the format is invalid -- including a group that is
 *   not 1-4 hex digits, more than one `::`, a `::` covering no groups,
 *   whitespace, or the wrong number of groups
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
 * assertEquals(parseAddressv6("::"), 0n);
 * assertEquals(parseAddressv6("::1"), 1n);
 * assertEquals(parseAddressv6("2001:db8::1"), 42540766411282592856903984951653826561n);
 * assertEquals(parseAddressv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"), 340282366920938463463374607431768211455n);
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
 * @example Zone ID handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(parseAddressv6("fe80::1%eth0"), parseAddressv6("fe80::1"));
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
 * ```
 */
export function parseAddressv6(address: string): bigint {
  // The zone ID is stripped without being examined; its grammar (RFC 6874)
  // is deliberately not enforced here.
  const zoneIndex = address.indexOf("%");
  const end = zoneIndex === -1 ? address.length : zoneIndex;

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
      const nextColon = address.indexOf(":", index);
      if (nextColon === -1 || nextColon > end) {
        packed = (packed << 32n) |
          BigInt(parseAddressv4(address.slice(start, end)));
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
      const stop = colon === -1 || colon > end ? end : colon;
      throw new TypeError(
        `Invalid IPv6 group: '${
          address.slice(start, stop)
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
 * Stringifies a bigint to an IPv6 address in compressed colon-hexadecimal notation.
 *
 * The output uses the canonical compressed form:
 * - Leading zeros in each group are omitted
 * - The longest run of consecutive all-zero groups is replaced with `::`
 * - If there are multiple runs of the same length, the first one is compressed
 *
 * @param address The address as a 128-bit bigint
 * @returns The IPv6 address string in compressed colon-hexadecimal notation
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
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * assertThrows(() => stringifyAddressv6(-1n), RangeError);
 * assertThrows(() => stringifyAddressv6(340282366920938463463374607431768211456n), RangeError);
 * ```
 */
export function stringifyAddressv6(address: bigint): string {
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
 * Stringifies a bigint to an IPv6 address in full uncompressed
 * colon-hexadecimal notation.
 *
 * Every one of the 8 groups is written with all 4 hex digits, and no run of
 * zero groups is replaced with `::`. This is the counterpart of
 * {@link stringifyAddressv6}, which produces the canonical compressed form, and
 * the bigint-taking counterpart of {@link expandIpv6}, which takes a string.
 *
 * @param address The address as a 128-bit bigint
 * @returns The IPv6 address string with all 8 groups written in full
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
 * @example Nothing is compressed or elided
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv6, stringifyAddressv6, stringifyAddressv6Expanded } from "@hertzg/ip/addressv6";
 *
 * const address = parseAddressv6("2001:db8::1");
 * assertEquals(stringifyAddressv6(address), "2001:db8::1");
 * assertEquals(stringifyAddressv6Expanded(address), "2001:0db8:0000:0000:0000:0000:0000:0001");
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
export function stringifyAddressv6Expanded(address: bigint): string {
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
 * Expands an IPv6 address to its full uncompressed form.
 *
 * Returns the address with all 8 groups fully specified with 4 hex digits each.
 * This is equivalent to parsing the address and re-stringifying it with
 * {@link stringifyAddressv6Expanded}.
 *
 * @param address The address string (can be compressed)
 * @returns The fully expanded IPv6 address string
 * @throws Propagates errors from parseAddressv6 if the input is invalid
 *
 * @example Expanding addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { expandIpv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(expandIpv6("::"), "0000:0000:0000:0000:0000:0000:0000:0000");
 * assertEquals(expandIpv6("::1"), "0000:0000:0000:0000:0000:0000:0000:0001");
 * assertEquals(expandIpv6("2001:db8::1"), "2001:0db8:0000:0000:0000:0000:0000:0001");
 * assertEquals(expandIpv6("fe80::1%eth0"), "fe80:0000:0000:0000:0000:0000:0000:0001");
 * ```
 */
export function expandIpv6(address: string): string {
  return stringifyAddressv6Expanded(parseAddressv6(address));
}

/**
 * Compresses an IPv6 address to its shortest canonical form.
 *
 * This is equivalent to parsing and re-stringifying the address,
 * which produces the canonical compressed representation.
 *
 * @param address The address string
 * @returns The compressed IPv6 address string
 * @throws Propagates errors from parseAddressv6 if the input is invalid
 *
 * @example Compressing addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compressIpv6 } from "@hertzg/ip/addressv6";
 *
 * assertEquals(compressIpv6("0000:0000:0000:0000:0000:0000:0000:0000"), "::");
 * assertEquals(compressIpv6("0000:0000:0000:0000:0000:0000:0000:0001"), "::1");
 * assertEquals(compressIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"), "2001:db8::1");
 * assertEquals(compressIpv6("fe80:0000:0000:0000:0000:0000:0000:0001"), "fe80::1");
 * ```
 */
export function compressIpv6(address: string): string {
  return stringifyAddressv6(parseAddressv6(address));
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
 * const addresses = ["2001:db8::9", "2001:db8::10", "2001:db8::2"].map(parseAddressv6);
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
 * assertEquals(compareAddressv6(parseAddressv6("::1"), parseAddressv6("::2")), -1);
 * assertEquals(compareAddressv6(parseAddressv6("::2"), parseAddressv6("::1")), 1);
 * assertEquals(compareAddressv6(parseAddressv6("::1"), parseAddressv6("::1")), 0);
 * ```
 */
export function compareAddressv6(a: bigint, b: bigint): -1 | 0 | 1 {
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
 *   stringifyAddressv6(mapFromAddressv4(parseAddressv4("192.168.1.1"))),
 *   "::ffff:c0a8:101",
 * );
 * assertEquals(
 *   stringifyAddressv6(mapFromAddressv4(parseAddressv4("127.0.0.1"))),
 *   "::ffff:7f00:1",
 * );
 * assertEquals(
 *   stringifyAddressv6(mapFromAddressv4(parseAddressv4("0.0.0.0"))),
 *   "::ffff:0:0",
 * );
 * ```
 */
export function mapFromAddressv4(address: number): bigint {
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
 *   stringifyAddressv4(unmapToAddressv4(parseAddressv6("::ffff:192.168.1.1"))),
 *   "192.168.1.1",
 * );
 * assertEquals(
 *   stringifyAddressv4(unmapToAddressv4(parseAddressv6("::ffff:c0a8:101"))),
 *   "192.168.1.1",
 * );
 * assertEquals(
 *   stringifyAddressv4(unmapToAddressv4(parseAddressv6("::ffff:0.0.0.0"))),
 *   "0.0.0.0",
 * );
 * ```
 */
export function unmapToAddressv4(address: bigint): number {
  return Number(address & IPV4_MASK);
}
