/**
 * IPv4 address parsing and stringifying utilities.
 *
 * This module provides functions to convert between IPv4 dotted decimal
 * notation and number representation, enabling arithmetic operations on
 * IP addresses.
 *
 * @example Basic IPv4 operations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const ip = parseIpv4("192.168.1.1");
 * assertEquals(ip, 3232235777);
 *
 * const next = ip + 1;
 * assertEquals(stringifyIpv4(next), "192.168.1.2");
 * ```
 *
 * @example Bitwise operations on IPv4 addresses
 *
 * Since IPv4 addresses are plain numbers, you can use standard JavaScript
 * bitwise operators directly instead of library functions. Use `>>> 0` to
 * keep results as unsigned 32-bit integers.
 *
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * const ip = parseIpv4("192.168.1.100");
 * const mask = cidrv4Mask(24);
 *
 * // Bitwise NOT (invert all bits)
 * const inverted = (~ip >>> 0);
 * assertEquals(stringifyIpv4(inverted), "63.87.254.155");
 *
 * // Bitwise AND (apply network mask to get network address)
 * const network = ((ip & mask) >>> 0);
 * assertEquals(stringifyIpv4(network), "192.168.1.0");
 *
 * // Bitwise OR (combine network with host bits for broadcast)
 * const broadcast = ((network | (~mask >>> 0)) >>> 0);
 * assertEquals(stringifyIpv4(broadcast), "192.168.1.255");
 *
 * // Direct comparison (no isEqual() needed)
 * assertEquals(parseIpv4("10.0.0.1") === parseIpv4("10.0.0.1"), true);
 * assertEquals(parseIpv4("10.0.0.1") === parseIpv4("10.0.0.2"), false);
 * ```
 *
 * @module
 */

/** Character codes the octet scanner compares against. */
const CHAR_ZERO = 0x30;
const CHAR_NINE = 0x39;
const CHAR_DOT = 0x2e;

/** The text of the octet starting at `from`, for an error message. */
function octetText(address: string, from: number): string {
  const dot = address.indexOf(".", from);
  return address.slice(from, dot === -1 ? address.length : dot);
}

/**
 * Reports a malformed octet, unless the address does not have four of them --
 * the octet count is the coarser complaint and is made first, as it was when
 * the address was read by splitting on ".".
 *
 * Counting is done here rather than up front so that the scan itself never
 * pays for it; only the failing call does.
 */
function failIpv4(address: string, error: TypeError | RangeError): never {
  let octets = 1;
  for (let index = 0; index < address.length; index++) {
    if (address.charCodeAt(index) === CHAR_DOT) octets++;
  }

  if (octets !== 4) {
    throw new TypeError(
      `IPv4 address must have exactly 4 octets, got ${octets}`,
    );
  }

  throw error;
}

/**
 * Parses an IPv4 address in dotted decimal notation to a number.
 *
 * An octet is decimal digits and nothing else: no leading zeros (except "0"
 * itself), no surrounding or embedded whitespace, no sign, no radix prefix,
 * and no trailing text.
 *
 * @param address The address string in dotted decimal notation
 * @returns The IPv4 address as a 32-bit unsigned integer
 * @throws {TypeError} If the format is invalid -- wrong number of octets, a
 *   non-decimal octet, leading zeros, a sign, whitespace, or trailing text
 * @throws {RangeError} If an octet is a well-formed number greater than 255
 *
 * @example Basic parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(parseIpv4("192.168.1.1"), 3232235777);
 * assertEquals(parseIpv4("10.0.0.1"), 167772161);
 * assertEquals(parseIpv4("0.0.0.0"), 0);
 * assertEquals(parseIpv4("255.255.255.255"), 4294967295);
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertThrows(() => parseIpv4("192.168.1"), TypeError);
 * assertThrows(() => parseIpv4("192.168.1.256"), RangeError);
 * assertThrows(() => parseIpv4("192.168.01.1"), TypeError);
 * assertThrows(() => parseIpv4(" 192.168.1.1"), TypeError);
 * assertThrows(() => parseIpv4("192.168.1.1abc"), TypeError);
 * ```
 */
export function parseIpv4(address: string): number {
  const length = address.length;
  let value = 0;
  let index = 0;

  for (let octetIndex = 0; octetIndex < 4; octetIndex++) {
    const octetStart = index;
    let code = address.charCodeAt(index);

    let octet = 0;
    while (code >= CHAR_ZERO && code <= CHAR_NINE) {
      octet = octet * 10 + (code - CHAR_ZERO);
      code = address.charCodeAt(++index); // NaN past the end ends the loop
    }

    // The octet runs to the "." before the next one, or to the end of the
    // string for the last one. Anything else left over is trailing text.
    const ended = octetIndex === 3 ? index === length : code === CHAR_DOT;

    // "0" alone is the only octet that may start with a zero, so the check is
    // on the whole octet rather than on the digits scanned: "0a" is a leading
    // zero, not a stray letter.
    if (
      address.charCodeAt(octetStart) === CHAR_ZERO &&
      !(index - octetStart === 1 && ended)
    ) {
      failIpv4(
        address,
        new TypeError(
          "IPv4 octets cannot have leading zeros except '0' itself",
        ),
      );
    }

    // "-" is not a digit, so a signed octet fails here like any other stray
    // character. RangeError is left to mean a well-formed number that is too
    // large, which is the only way an octet can be numerically wrong.
    if (index === octetStart || !ended) {
      failIpv4(
        address,
        new TypeError(
          `IPv4 address octets must be decimal numbers, got '${
            octetText(address, octetStart)
          }'`,
        ),
      );
    }

    if (octet > 255) {
      failIpv4(
        address,
        new RangeError(`IPv4 octet out of range: ${octet} (must be 0-255)`),
      );
    }

    index++; // the "." that ended the octet, or one past the end of the string
    value = (value << 8) | octet;
  }

  return value >>> 0; // Unsigned 32-bit
}

/**
 * Stringifies a number to an IPv4 address in dotted decimal notation.
 *
 * The number must represent a valid 32-bit unsigned integer (0 to 4294967295).
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns The IPv4 address string in dotted decimal notation
 * @throws {RangeError} If the address is negative or greater than 2^32-1
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(stringifyIpv4(3232235777), "192.168.1.1");
 * assertEquals(stringifyIpv4(167772161), "10.0.0.1");
 * assertEquals(stringifyIpv4(0), "0.0.0.0");
 * assertEquals(stringifyIpv4(4294967295), "255.255.255.255");
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertThrows(() => stringifyIpv4(-1), RangeError);
 * assertThrows(() => stringifyIpv4(4294967296), RangeError);
 * ```
 */
export function stringifyIpv4(address: number): string {
  if (address < 0 || address > 4294967295 || !Number.isInteger(address)) {
    throw new RangeError(
      `IPv4 value out of range: ${address} (must be 0 to 4294967295)`,
    );
  }

  const octet0 = (address >>> 24) & 0xFF;
  const octet1 = (address >>> 16) & 0xFF;
  const octet2 = (address >>> 8) & 0xFF;
  const octet3 = address & 0xFF;

  return `${octet0}.${octet1}.${octet2}.${octet3}`;
}

/**
 * Compares two IPv4 addresses for sorting, numerically ascending.
 *
 * Suitable as an `Array.prototype.sort` / `toSorted` comparator. For a
 * comparator that also accepts IPv6 addresses, see {@link compareIp}, which
 * sorts every IPv4 address before every IPv6 one.
 *
 * @param a The first address
 * @param b The second address
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort addresses numerically, not lexicographically
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareIpv4, parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const addresses = ["10.0.0.9", "10.0.0.10", "10.0.0.2"].map(parseIpv4);
 *
 * assertEquals(addresses.toSorted(compareIpv4).map(stringifyIpv4), [
 *   "10.0.0.2",
 *   "10.0.0.9",
 *   "10.0.0.10",
 * ]);
 * ```
 *
 * @example The three possible results
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareIpv4, parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(compareIpv4(parseIpv4("10.0.0.1"), parseIpv4("10.0.0.2")), -1);
 * assertEquals(compareIpv4(parseIpv4("10.0.0.2"), parseIpv4("10.0.0.1")), 1);
 * assertEquals(compareIpv4(parseIpv4("10.0.0.1"), parseIpv4("10.0.0.1")), 0);
 * ```
 */
export function compareIpv4(a: number, b: number): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
