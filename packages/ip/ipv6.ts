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
 * import { parseIpv6, stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * const ip = parseIpv6("2001:db8::1");
 * assertEquals(ip, 42540766411282592856903984951653826561n);
 *
 * const next = ip + 1n;
 * assertEquals(stringifyIpv6(next), "2001:db8::2");
 * ```
 *
 * @module
 */

import { parseIpv4 } from "./ipv4.ts";

/**
 * Parses an IPv6 address in colon-hexadecimal notation to a bigint.
 *
 * Supports standard IPv6 formats:
 * - Full form: `2001:0db8:0000:0000:0000:0000:0000:0001`
 * - Compressed form with `::`: `2001:db8::1`
 * - Mixed IPv4 form: `::ffff:192.168.1.1`
 * - Zone IDs are stripped: `fe80::1%eth0` becomes `fe80::1`
 *
 * @param ip The IPv6 address string in colon-hexadecimal notation
 * @returns The IPv6 address as a 128-bit bigint
 * @throws {TypeError} If the format is invalid
 * @throws {RangeError} If any group is out of range (not 0-ffff)
 *
 * @example Basic parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(parseIpv6("::"), 0n);
 * assertEquals(parseIpv6("::1"), 1n);
 * assertEquals(parseIpv6("2001:db8::1"), 42540766411282592856903984951653826561n);
 * assertEquals(parseIpv6("ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff"), 340282366920938463463374607431768211455n);
 * ```
 *
 * @example Compressed forms
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(parseIpv6("2001:db8::"), parseIpv6("2001:0db8:0000:0000:0000:0000:0000:0000"));
 * assertEquals(parseIpv6("::ffff:192.168.1.1"), parseIpv6("0:0:0:0:0:ffff:c0a8:0101"));
 * ```
 *
 * @example Zone ID handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(parseIpv6("fe80::1%eth0"), parseIpv6("fe80::1"));
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertThrows(() => parseIpv6("192.168.1.1"), TypeError);
 * assertThrows(() => parseIpv6("2001:db8:::1"), TypeError);
 * assertThrows(() => parseIpv6("2001:db8::1::1"), TypeError);
 * assertThrows(() => parseIpv6("2001:gggg::1"), TypeError);
 * ```
 */
export function parseIpv6(ip: string): bigint {
  // Strip zone ID if present (e.g., fe80::1%eth0)
  const zoneIndex = ip.indexOf("%");
  if (zoneIndex !== -1) {
    ip = ip.slice(0, zoneIndex);
  }

  // Check for IPv4-mapped address (::ffff:192.168.1.1)
  const lastColonIndex = ip.lastIndexOf(":");
  const possibleIpv4 = ip.slice(lastColonIndex + 1);
  if (possibleIpv4.includes(".")) {
    // Parse using the IPv4 parser for proper validation and consistency
    const ipv4Value = parseIpv4(possibleIpv4);
    // Replace the IPv4 portion with two hex groups (high 16 bits, low 16 bits)
    const hexGroup1 = ((ipv4Value >> 16n) & 0xFFFFn).toString(16);
    const hexGroup2 = (ipv4Value & 0xFFFFn).toString(16);
    ip = ip.slice(0, lastColonIndex + 1) + hexGroup1 + ":" + hexGroup2;
  }

  // Handle :: expansion
  if (ip.includes("::")) {
    const doubleColonCount = (ip.match(/::/g) || []).length;
    if (doubleColonCount > 1) {
      throw new TypeError("IPv6 address can only contain one '::'");
    }

    const [left, right] = ip.split("::");
    const leftParts = left === "" ? [] : left.split(":");
    const rightParts = right === "" ? [] : right.split(":");

    const totalParts = leftParts.length + rightParts.length;
    if (totalParts > 8) {
      throw new TypeError(
        `IPv6 address has too many groups: ${totalParts} (max 8)`,
      );
    }

    const missingParts = 8 - totalParts;
    const zeroParts = Array(missingParts).fill("0");
    const allParts = [...leftParts, ...zeroParts, ...rightParts];

    return parseFullIpv6(allParts);
  }

  // Standard form - must have exactly 8 groups
  const parts = ip.split(":");
  if (parts.length !== 8) {
    throw new TypeError(
      `IPv6 address must have exactly 8 groups (or use ::), got ${parts.length}`,
    );
  }

  return parseFullIpv6(parts);
}

/**
 * Parses an array of 8 hex groups to a bigint.
 */
function parseFullIpv6(parts: string[]): bigint {
  let result = 0n;

  for (let i = 0; i < 8; i++) {
    const part = parts[i];

    // Validate hex format
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
      throw new TypeError(
        `Invalid IPv6 group: '${part}' (must be 1-4 hex digits)`,
      );
    }

    const value = parseInt(part, 16);
    if (value < 0 || value > 0xFFFF) {
      throw new RangeError(
        `IPv6 group out of range: ${value} (must be 0-65535)`,
      );
    }

    result = (result << 16n) | BigInt(value);
  }

  return result;
}

/**
 * Stringifies a bigint to an IPv6 address in compressed colon-hexadecimal notation.
 *
 * The output uses the canonical compressed form:
 * - Leading zeros in each group are omitted
 * - The longest run of consecutive all-zero groups is replaced with `::`
 * - If there are multiple runs of the same length, the first one is compressed
 *
 * @param value The IPv6 address as a bigint
 * @returns The IPv6 address string in compressed colon-hexadecimal notation
 * @throws {RangeError} If the value is negative or greater than 2^128-1
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(stringifyIpv6(0n), "::");
 * assertEquals(stringifyIpv6(1n), "::1");
 * assertEquals(stringifyIpv6(42540766411282592856903984951653826561n), "2001:db8::1");
 * ```
 *
 * @example Compression rules
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(stringifyIpv6(0x20010db8000000000000000000000001n), "2001:db8::1");
 * assertEquals(stringifyIpv6(0x20010db800000000000000000000abcdn), "2001:db8::abcd");
 * assertEquals(stringifyIpv6(0x00010000000000000001000000000001n), "1::1:0:0:1");
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertThrows(() => stringifyIpv6(-1n), RangeError);
 * assertThrows(() => stringifyIpv6(340282366920938463463374607431768211456n), RangeError);
 * ```
 */
export function stringifyIpv6(value: bigint): string {
  if (value < 0n || value > 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) {
    throw new RangeError(
      `IPv6 value out of range: ${value} (must be 0 to 2^128-1)`,
    );
  }

  // Extract 8 groups of 16 bits each
  const groups: number[] = [];
  for (let i = 0; i < 8; i++) {
    const group = Number((value >> BigInt((7 - i) * 16)) & 0xFFFFn);
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
 * Expands an IPv6 address to its full uncompressed form.
 *
 * Returns the address with all 8 groups fully specified with 4 hex digits each.
 *
 * @param ip The IPv6 address string (can be compressed)
 * @returns The fully expanded IPv6 address string
 * @throws Propagates errors from parseIpv6 if the input is invalid
 *
 * @example Expanding addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { expandIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(expandIpv6("::"), "0000:0000:0000:0000:0000:0000:0000:0000");
 * assertEquals(expandIpv6("::1"), "0000:0000:0000:0000:0000:0000:0000:0001");
 * assertEquals(expandIpv6("2001:db8::1"), "2001:0db8:0000:0000:0000:0000:0000:0001");
 * assertEquals(expandIpv6("fe80::1%eth0"), "fe80:0000:0000:0000:0000:0000:0000:0001");
 * ```
 */
export function expandIpv6(ip: string): string {
  const value = parseIpv6(ip);

  const groups: string[] = [];
  for (let i = 0; i < 8; i++) {
    const group = Number((value >> BigInt((7 - i) * 16)) & 0xFFFFn);
    groups.push(group.toString(16).padStart(4, "0"));
  }

  return groups.join(":");
}

/**
 * Compresses an IPv6 address to its shortest canonical form.
 *
 * This is equivalent to parsing and re-stringifying the address,
 * which produces the canonical compressed representation.
 *
 * @param ip The IPv6 address string
 * @returns The compressed IPv6 address string
 * @throws Propagates errors from parseIpv6 if the input is invalid
 *
 * @example Compressing addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compressIpv6 } from "@hertzg/ip/ipv6";
 *
 * assertEquals(compressIpv6("0000:0000:0000:0000:0000:0000:0000:0000"), "::");
 * assertEquals(compressIpv6("0000:0000:0000:0000:0000:0000:0000:0001"), "::1");
 * assertEquals(compressIpv6("2001:0db8:0000:0000:0000:0000:0000:0001"), "2001:db8::1");
 * assertEquals(compressIpv6("fe80:0000:0000:0000:0000:0000:0000:0001"), "fe80::1");
 * ```
 */
export function compressIpv6(ip: string): string {
  return stringifyIpv6(parseIpv6(ip));
}
