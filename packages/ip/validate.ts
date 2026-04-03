/**
 * IP address and CIDR validation utilities.
 *
 * This module provides non-throwing validation functions for IPv4/IPv6 addresses
 * and CIDR notation, as well as a universal {@link validate} function that
 * identifies and parses any valid IP or CIDR string.
 *
 * @example Check if strings are valid
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidIpv4, isValidIpv6, isValidCidr4, isValidCidr6 } from "@hertzg/ip/validate";
 *
 * assert(isValidIpv4("192.168.1.1"));
 * assertEquals(isValidIpv4("999.0.0.1"), false);
 *
 * assert(isValidIpv6("2001:db8::1"));
 * assertEquals(isValidIpv6("not:an:address"), false);
 *
 * assert(isValidCidr4("10.0.0.0/8"));
 * assertEquals(isValidCidr4("10.0.0.0/33"), false);
 *
 * assert(isValidCidr6("2001:db8::/32"));
 * assertEquals(isValidCidr6("2001:db8::/129"), false);
 * ```
 *
 * @example Universal validation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validate } from "@hertzg/ip/validate";
 *
 * const r1 = validate("192.168.1.1");
 * assertEquals(r1.kind, "ipv4");
 *
 * const r2 = validate("2001:db8::1");
 * assertEquals(r2.kind, "ipv6");
 *
 * const r3 = validate("10.0.0.0/8");
 * assertEquals(r3.kind, "cidr4");
 *
 * const r4 = validate("2001:db8::/32");
 * assertEquals(r4.kind, "cidr6");
 *
 * const r5 = validate("not valid");
 * assertEquals(r5.kind, "invalid");
 * ```
 *
 * @module
 */

import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";
import { type Cidr4, parseCidr4 } from "./cidrv4.ts";
import { type Cidr6, parseCidr6 } from "./cidrv6.ts";

/**
 * The result of the {@link validate} function.
 *
 * Discriminated union on `kind`:
 * - `"ipv4"` — valid IPv4 address with parsed `value` as a 32-bit number
 * - `"ipv6"` — valid IPv6 address with parsed `value` as a 128-bit bigint
 * - `"cidr4"` — valid IPv4 CIDR with parsed `value` as a {@link Cidr4}
 * - `"cidr6"` — valid IPv6 CIDR with parsed `value` as a {@link Cidr6}
 * - `"invalid"` — the string is not a valid IP address or CIDR notation
 */
export type ValidationResult =
  | { readonly kind: "ipv4"; readonly value: number }
  | { readonly kind: "ipv6"; readonly value: bigint }
  | { readonly kind: "cidr4"; readonly value: Cidr4 }
  | { readonly kind: "cidr6"; readonly value: Cidr6 }
  | { readonly kind: "invalid" };

/**
 * Checks if a string is a valid IPv4 address in dotted decimal notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is a valid IPv4 address
 *
 * @example Valid addresses
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidIpv4 } from "@hertzg/ip/validate";
 *
 * assert(isValidIpv4("0.0.0.0"));
 * assert(isValidIpv4("192.168.1.1"));
 * assert(isValidIpv4("255.255.255.255"));
 * ```
 *
 * @example Invalid addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIpv4 } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidIpv4(""), false);
 * assertEquals(isValidIpv4("256.0.0.1"), false);
 * assertEquals(isValidIpv4("1.2.3"), false);
 * assertEquals(isValidIpv4("01.02.03.04"), false);
 * assertEquals(isValidIpv4("::1"), false);
 * ```
 */
export function isValidIpv4(s: string): boolean {
  try {
    parseIpv4(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is a valid IPv6 address in colon-hexadecimal notation.
 *
 * Accepts full form, compressed form with `::`, IPv4-mapped addresses
 * (`::ffff:192.168.1.1`), and addresses with zone IDs (`fe80::1%eth0`).
 *
 * @param s The string to validate
 * @returns `true` if the string is a valid IPv6 address
 *
 * @example Valid addresses
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidIpv6 } from "@hertzg/ip/validate";
 *
 * assert(isValidIpv6("::"));
 * assert(isValidIpv6("::1"));
 * assert(isValidIpv6("2001:db8::1"));
 * assert(isValidIpv6("::ffff:192.168.1.1"));
 * assert(isValidIpv6("fe80::1%eth0"));
 * ```
 *
 * @example Invalid addresses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIpv6 } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidIpv6(""), false);
 * assertEquals(isValidIpv6("192.168.1.1"), false);
 * assertEquals(isValidIpv6("2001:db8:::1"), false);
 * assertEquals(isValidIpv6("gggg::1"), false);
 * ```
 */
export function isValidIpv6(s: string): boolean {
  try {
    parseIpv6(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv4 CIDR notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is valid IPv4 CIDR notation
 *
 * @example Valid CIDR
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidCidr4 } from "@hertzg/ip/validate";
 *
 * assert(isValidCidr4("0.0.0.0/0"));
 * assert(isValidCidr4("192.168.1.0/24"));
 * assert(isValidCidr4("10.0.0.1/32"));
 * ```
 *
 * @example Invalid CIDR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidCidr4 } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidCidr4(""), false);
 * assertEquals(isValidCidr4("192.168.1.0"), false);
 * assertEquals(isValidCidr4("192.168.1.0/33"), false);
 * assertEquals(isValidCidr4("192.168.1.0/-1"), false);
 * assertEquals(isValidCidr4("2001:db8::/32"), false);
 * ```
 */
export function isValidCidr4(s: string): boolean {
  try {
    parseCidr4(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a string is valid IPv6 CIDR notation.
 *
 * @param s The string to validate
 * @returns `true` if the string is valid IPv6 CIDR notation
 *
 * @example Valid CIDR
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValidCidr6 } from "@hertzg/ip/validate";
 *
 * assert(isValidCidr6("::/0"));
 * assert(isValidCidr6("2001:db8::/32"));
 * assert(isValidCidr6("::1/128"));
 * ```
 *
 * @example Invalid CIDR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidCidr6 } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidCidr6(""), false);
 * assertEquals(isValidCidr6("2001:db8::1"), false);
 * assertEquals(isValidCidr6("2001:db8::/129"), false);
 * assertEquals(isValidCidr6("192.168.1.0/24"), false);
 * ```
 */
export function isValidCidr6(s: string): boolean {
  try {
    parseCidr6(s);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates and identifies any IP address or CIDR notation string.
 *
 * Attempts to parse the string as IPv4, IPv6, IPv4 CIDR, or IPv6 CIDR
 * and returns a discriminated union indicating what was found. Strings
 * containing `/` are tested as CIDR first; others are tested as plain
 * addresses.
 *
 * @param s The string to validate and identify
 * @returns A {@link ValidationResult} with the parsed value, or `{ kind: "invalid" }`
 *
 * @example Identify and use parsed values
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validate } from "@hertzg/ip/validate";
 *
 * const ipv4 = validate("192.168.1.1");
 * assertEquals(ipv4.kind, "ipv4");
 * if (ipv4.kind === "ipv4") {
 *   assertEquals(ipv4.value, 3232235777);
 * }
 *
 * const ipv6 = validate("::1");
 * assertEquals(ipv6.kind, "ipv6");
 * if (ipv6.kind === "ipv6") {
 *   assertEquals(ipv6.value, 1n);
 * }
 *
 * const cidr4 = validate("10.0.0.0/8");
 * assertEquals(cidr4.kind, "cidr4");
 * if (cidr4.kind === "cidr4") {
 *   assertEquals(cidr4.value.prefixLength, 8);
 * }
 *
 * const cidr6 = validate("2001:db8::/32");
 * assertEquals(cidr6.kind, "cidr6");
 * if (cidr6.kind === "cidr6") {
 *   assertEquals(cidr6.value.prefixLength, 32);
 * }
 *
 * assertEquals(validate("garbage").kind, "invalid");
 * ```
 *
 * @example Use in input handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validate } from "@hertzg/ip/validate";
 *
 * const result = validate("fe80::1");
 * switch (result.kind) {
 *   case "ipv4":
 *   case "ipv6":
 *     assertEquals(typeof result.value === "bigint", true);
 *     break;
 *   case "cidr4":
 *   case "cidr6":
 *     break;
 *   case "invalid":
 *     break;
 * }
 * ```
 */
export function validate(s: string): ValidationResult {
  if (s.includes("/")) {
    try {
      return { kind: "cidr4", value: parseCidr4(s) };
    } catch {
      // not cidr4
    }
    try {
      return { kind: "cidr6", value: parseCidr6(s) };
    } catch {
      // not cidr6
    }
  } else {
    try {
      return { kind: "ipv4", value: parseIpv4(s) };
    } catch {
      // not ipv4
    }
    try {
      return { kind: "ipv6", value: parseIpv6(s) };
    } catch {
      // not ipv6
    }
  }
  return { kind: "invalid" };
}
