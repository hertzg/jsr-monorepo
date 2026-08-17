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
 * import { parseAddressv4, stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const { address } = parseAddressv4("192.168.1.1");
 * assertEquals(address, 3232235777);
 *
 * const next = address + 1;
 * assertEquals(stringifyAddressv4(next), "192.168.1.2");
 * ```
 *
 * @example Zone IDs are carried, not applied
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv4, stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const gateway = parseAddressv4("10.155.101.1%ether1");
 * assertEquals(gateway, { address: 177956097, zoneId: "ether1" });
 * assertEquals(stringifyAddressv4(gateway), "10.155.101.1%ether1");
 * assertEquals(stringifyAddressv4(gateway.address), "10.155.101.1");
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
 * import { parseAddressv4, stringifyAddressv4 } from "@hertzg/ip/addressv4";
 * import { cidrv4Mask } from "@hertzg/ip/cidrv4";
 *
 * const ip = parseAddressv4("192.168.1.100").address;
 * const mask = cidrv4Mask(24);
 *
 * // Bitwise NOT (invert all bits)
 * const inverted = (~ip >>> 0);
 * assertEquals(stringifyAddressv4(inverted), "63.87.254.155");
 *
 * // Bitwise AND (apply network mask to get network address)
 * const network = ((ip & mask) >>> 0);
 * assertEquals(stringifyAddressv4(network), "192.168.1.0");
 *
 * // Bitwise OR (combine network with host bits for broadcast)
 * const broadcast = ((network | (~mask >>> 0)) >>> 0);
 * assertEquals(stringifyAddressv4(broadcast), "192.168.1.255");
 *
 * // Direct comparison (no isEqual() needed)
 * assertEquals(parseAddressv4("10.0.0.1").address === parseAddressv4("10.0.0.1").address, true);
 * assertEquals(parseAddressv4("10.0.0.1").address === parseAddressv4("10.0.0.2").address, false);
 * ```
 *
 * @module
 */

import { splitNotation, type ZoneId } from "./notation.ts";

export type {
  /** The zone ID after `%`, a string. */
  ZoneId,
} from "./notation.ts";

/**
 * An IPv4 address as a 32-bit unsigned integer, `0` to `4294967295`. The
 * primitive type is what carries the version: a `number` is IPv4, a
 * `bigint` is IPv6 (ADR 0001).
 */
export type Addressv4 = number;

/**
 * What {@link parseAddressv4} returns and what {@link stringifyAddressv4}
 * accepts: the address, plus the zone ID if the notation had one. Read
 * `.address` for the bare {@link Addressv4}; the zone never touches the
 * value, and no operation in this package reads it.
 */
export type ParsedAddressv4 = {
  /** The address as a 32-bit unsigned integer */
  readonly address: Addressv4;
  /** The zone ID after `%`, verbatim, when the notation had one */
  readonly zoneId?: ZoneId;
};

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
 * Reads a bare IPv4 address slice, the layer-2 scanner of ADR 0003. The
 * slice holds neither `%` nor `/`; {@link splitNotation} took those off.
 */
function scanAddressv4(address: string): Addressv4 {
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
 * Parses an IPv4 address in dotted decimal notation, with an optional zone
 * ID, to its numeric value.
 *
 * The notation is `address [ "%" zoneId ]` (ADR 0003). An octet is decimal
 * digits and nothing else: no leading zeros (except "0" itself), no
 * surrounding or embedded whitespace, no sign, no radix prefix, and no
 * trailing text. The zone ID, when present, is carried verbatim: it may
 * not contain `%`, `/` or whitespace, is never percent-decoded, and never
 * touches the numeric value. RouterOS writes `gateway=10.155.101.1%ether1`,
 * so IPv4 zones are accepted on the same terms as IPv6 ones.
 *
 * A prefix is not accepted; that is {@link parseCidrv4}'s slot. An
 * IPv4-mapped IPv6 address such as `::ffff:1.2.3.4` is IPv6 notation and is
 * rejected here; {@link parseAddress} unmaps it.
 *
 * @param address The address string, dotted decimal with an optional `%zoneId`
 * @returns The address as a 32-bit unsigned integer, and the zone ID if there was one
 * @throws {TypeError} If the format is invalid -- wrong number of octets, a
 *   non-decimal octet, leading zeros, a sign, whitespace, trailing text, a
 *   prefix, an empty or malformed zone ID
 * @throws {RangeError} If an octet is a well-formed number greater than 255
 *
 * @example Basic parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(parseAddressv4("192.168.1.1"), { address: 3232235777 });
 * assertEquals(parseAddressv4("10.0.0.1"), { address: 167772161 });
 * assertEquals(parseAddressv4("0.0.0.0"), { address: 0 });
 * assertEquals(parseAddressv4("255.255.255.255"), { address: 4294967295 });
 * ```
 *
 * @example A zone ID is carried verbatim
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(parseAddressv4("192.168.1.1%ether1"), {
 *   address: 3232235777,
 *   zoneId: "ether1",
 * });
 * assertEquals(parseAddressv4("192.168.1.1%25"), {
 *   address: 3232235777,
 *   zoneId: "25",
 * });
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertThrows(() => parseAddressv4("192.168.1"), TypeError);
 * assertThrows(() => parseAddressv4("192.168.1.256"), RangeError);
 * assertThrows(() => parseAddressv4("192.168.01.1"), TypeError);
 * assertThrows(() => parseAddressv4(" 192.168.1.1"), TypeError);
 * assertThrows(() => parseAddressv4("192.168.1.1abc"), TypeError);
 * assertThrows(() => parseAddressv4("192.168.1.1/24"), TypeError);
 * assertThrows(() => parseAddressv4("192.168.1.1%"), TypeError);
 * assertThrows(() => parseAddressv4("192.168.1.1% eth0"), TypeError);
 * assertThrows(() => parseAddressv4("::ffff:192.168.1.1"), TypeError);
 * ```
 */
export function parseAddressv4(address: string): ParsedAddressv4 {
  const slots = splitNotation(address);

  if (slots.prefix !== undefined) {
    throw new TypeError(
      `IPv4 address must not have a prefix, got '/${slots.prefix}'`,
    );
  }

  const value = scanAddressv4(slots.address);

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
 * Stringifies an IPv4 address to dotted decimal notation.
 *
 * Takes either the bare 32-bit unsigned integer or a {@link ParsedAddressv4};
 * given the latter, a truthy `zoneId` is appended after `%`, so
 * `stringifyAddressv4(parseAddressv4(s))` gives back `s` for every accepted
 * `s` in canonical form. `zoneId` must not contain `%`, `/` or whitespace:
 * a zone containing any of them cannot be written in RFC 4007 textual form
 * at all, because `%` is the delimiter, and the result would not re-parse.
 * If you are producing a URI, percent-encode it there (RFC 9844,
 * `[fe80::1%25eth0]`); this package does not apply that transform, since
 * `%25` is also a valid interface index 25.
 *
 * @param address The address as a 32-bit unsigned integer, or a parse result
 * @returns The IPv4 address string in dotted decimal notation, `%zoneId` appended when there is one
 * @throws {RangeError} If the address is negative or greater than 2^32-1
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(stringifyAddressv4(3232235777), "192.168.1.1");
 * assertEquals(stringifyAddressv4(167772161), "10.0.0.1");
 * assertEquals(stringifyAddressv4(0), "0.0.0.0");
 * assertEquals(stringifyAddressv4(4294967295), "255.255.255.255");
 * ```
 *
 * @example A parse result round-trips, zone included
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddressv4, stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(stringifyAddressv4(parseAddressv4("192.168.1.1%ether1")), "192.168.1.1%ether1");
 * assertEquals(stringifyAddressv4({ address: 3232235777 }), "192.168.1.1");
 * assertEquals(stringifyAddressv4({ address: 3232235777, zoneId: "" }), "192.168.1.1");
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertThrows(() => stringifyAddressv4(-1), RangeError);
 * assertThrows(() => stringifyAddressv4(4294967296), RangeError);
 * ```
 */
export function stringifyAddressv4(
  address: Addressv4 | ParsedAddressv4,
): string {
  if (typeof address === "object") {
    const text = stringifyAddressv4(address.address);
    return address.zoneId ? `${text}%${address.zoneId}` : text;
  }

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
 * comparator that also accepts IPv6 addresses, see {@link compareAddress}, which
 * sorts every IPv4 address before every IPv6 one.
 *
 * @param a The first address
 * @param b The second address
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort addresses numerically, not lexicographically
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddressv4, parseAddressv4, stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const addresses = ["10.0.0.9", "10.0.0.10", "10.0.0.2"].map((s) => parseAddressv4(s).address);
 *
 * assertEquals(addresses.toSorted(compareAddressv4).map(stringifyAddressv4), [
 *   "10.0.0.2",
 *   "10.0.0.9",
 *   "10.0.0.10",
 * ]);
 * ```
 *
 * @example The three possible results
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddressv4, parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * assertEquals(compareAddressv4(parseAddressv4("10.0.0.1").address, parseAddressv4("10.0.0.2").address), -1);
 * assertEquals(compareAddressv4(parseAddressv4("10.0.0.2").address, parseAddressv4("10.0.0.1").address), 1);
 * assertEquals(compareAddressv4(parseAddressv4("10.0.0.1").address, parseAddressv4("10.0.0.1").address), 0);
 * ```
 */
export function compareAddressv4(a: Addressv4, b: Addressv4): -1 | 0 | 1 {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
