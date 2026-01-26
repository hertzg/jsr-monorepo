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
 * @module
 */

/**
 * Parses an IPv4 address in dotted decimal notation to a number.
 *
 * The function validates the format and range of each octet. Leading zeros
 * are not allowed (except for "0" itself).
 *
 * @param ip The IPv4 address string in dotted decimal notation
 * @returns The IPv4 address as a 32-bit unsigned integer
 * @throws {TypeError} If the format is invalid (wrong number of octets, non-numeric, leading zeros)
 * @throws {RangeError} If any octet is out of range (not 0-255)
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
 * ```
 */
export function parseIpv4(ip: string): number {
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

  return value >>> 0; // Unsigned 32-bit
}

/**
 * Checks if a string is a valid IPv4 address in dotted decimal notation.
 *
 * Returns true if the string can be successfully parsed as an IPv4 address,
 * false otherwise. This function does not throw exceptions.
 *
 * @param ip The string to validate
 * @returns true if the string is a valid IPv4 address, false otherwise
 *
 * @example Valid IPv4 addresses
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidIpv4 } from "@hertzg/ip/ipv4";
 *
 * assert(isValidIpv4("192.168.1.1"));
 * assert(isValidIpv4("10.0.0.1"));
 * assert(isValidIpv4("0.0.0.0"));
 * assert(isValidIpv4("255.255.255.255"));
 * ```
 *
 * @example Invalid IPv4 addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(isValidIpv4("192.168.1"), false);
 * assertEquals(isValidIpv4("192.168.1.256"), false);
 * assertEquals(isValidIpv4("192.168.01.1"), false);
 * assertEquals(isValidIpv4("not an ip"), false);
 * assertEquals(isValidIpv4(""), false);
 * ```
 */
export function isValidIpv4(ip: string): boolean {
  try {
    parseIpv4(ip);
    return true;
  } catch {
    return false;
  }
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
  // Convert to number for faster bit operations (IPv4 fits in 32 bits)
  const num = typeof value === "bigint" ? Number(value) : value;

  if (num < 0 || num > 4294967295 || !Number.isInteger(num)) {
    throw new RangeError(
      `IPv4 value out of range: ${value} (must be 0 to 4294967295)`,
    );
  }

  const octet0 = (num >>> 24) & 0xFF;
  const octet1 = (num >>> 16) & 0xFF;
  const octet2 = (num >>> 8) & 0xFF;
  const octet3 = num & 0xFF;

  return `${octet0}.${octet1}.${octet2}.${octet3}`;
}
