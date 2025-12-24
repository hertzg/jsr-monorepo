/**
 * IPv4 address parsing and stringifying utilities.
 *
 * This module provides functions to convert between IPv4 dotted decimal
 * notation and bigint representation, enabling arithmetic operations on
 * IP addresses.
 *
 * @example Basic IPv4 operations
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4, stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * const ip = parseIpv4("192.168.1.1");
 * assertEquals(ip, 3232235777n);
 *
 * const next = ip + 1n;
 * assertEquals(stringifyIpv4(next), "192.168.1.2");
 * ```
 *
 * @module
 */

/**
 * Parses an IPv4 address in dotted decimal notation to a bigint.
 *
 * The function validates the format and range of each octet. Leading zeros
 * are not allowed (except for "0" itself).
 *
 * @param ip The IPv4 address string in dotted decimal notation
 * @returns The IPv4 address as a 32-bit bigint
 * @throws {TypeError} If the format is invalid (wrong number of octets, non-numeric, leading zeros)
 * @throws {RangeError} If any octet is out of range (not 0-255)
 *
 * @example Basic parsing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(parseIpv4("192.168.1.1"), 3232235777n);
 * assertEquals(parseIpv4("10.0.0.1"), 167772161n);
 * assertEquals(parseIpv4("0.0.0.0"), 0n);
 * assertEquals(parseIpv4("255.255.255.255"), 4294967295n);
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
 * ```
 */
export function parseIpv4(ip: string): bigint {
  const parts = ip.split(".");

  if (parts.length !== 4) {
    throw new TypeError(
      `IPv4 address must have exactly 4 octets, got ${parts.length}`,
    );
  }

  const octets: number[] = [];

  for (let i = 0; i < 4; i++) {
    const part = parts[i];

    // Check for leading zeros (except "0" itself)
    if (part.length > 1 && part[0] === "0") {
      throw new TypeError(
        "IPv4 octets cannot have leading zeros except '0' itself",
      );
    }

    const octet = parseInt(part, 10);

    if (Number.isNaN(octet)) {
      throw new TypeError("IPv4 address octets must be decimal numbers");
    }

    if (octet < 0 || octet > 255) {
      throw new RangeError(
        `IPv4 octet out of range: ${octet} (must be 0-255)`,
      );
    }

    octets.push(octet);
  }

  // Compute the 32-bit value
  const value = (octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) |
    octets[3];

  return BigInt(value >>> 0); // Unsigned 32-bit
}

/**
 * Stringifies a bigint to an IPv4 address in dotted decimal notation.
 *
 * The bigint must represent a valid 32-bit unsigned integer (0 to 4294967295).
 *
 * @param value The IPv4 address as a bigint
 * @returns The IPv4 address string in dotted decimal notation
 * @throws {RangeError} If the value is negative or greater than 2^32-1
 *
 * @example Basic stringifying
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(stringifyIpv4(3232235777n), "192.168.1.1");
 * assertEquals(stringifyIpv4(167772161n), "10.0.0.1");
 * assertEquals(stringifyIpv4(0n), "0.0.0.0");
 * assertEquals(stringifyIpv4(4294967295n), "255.255.255.255");
 * ```
 *
 * @example Error handling
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertThrows(() => stringifyIpv4(-1n), RangeError);
 * assertThrows(() => stringifyIpv4(4294967296n), RangeError);
 * ```
 */
export function stringifyIpv4(value: number | bigint): string {
  if (BigInt(value) < 0n || BigInt(value) > 4294967295n) {
    throw new RangeError(
      `IPv4 value out of range: ${value} (must be 0 to 4294967295)`,
    );
  }

  const octet0 = (BigInt(value) >> 24n) & 0xFFn;
  const octet1 = (BigInt(value) >> 16n) & 0xFFn;
  const octet2 = (BigInt(value) >> 8n) & 0xFFn;
  const octet3 = BigInt(value) & 0xFFn;

  return `${octet0}.${octet1}.${octet2}.${octet3}`;
}
