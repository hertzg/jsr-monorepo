/**
 * Universal IP address and CIDR validation utilities.
 *
 * This module provides a universal {@link validate} function that identifies
 * and parses any valid IP or CIDR string, and an {@link isValid} function
 * that checks if a string is any valid format.
 *
 * For version-specific validators, see:
 * - [`validatev4`](https://jsr.io/@hertzg/ip/doc/validatev4): {@link isValidIpv4}, {@link isValidCidr4}
 * - [`validatev6`](https://jsr.io/@hertzg/ip/doc/validatev6): {@link isValidIpv6}, {@link isValidCidr6}
 *
 * @example Universal validation
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValid, validate } from "@hertzg/ip/validate";
 *
 * assert(isValid("192.168.1.1"));
 * assert(isValid("::1"));
 * assert(isValid("10.0.0.0/8"));
 * assertEquals(isValid("garbage"), false);
 *
 * const r = validate("192.168.1.1");
 * assertEquals(r.kind, "ipv4");
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
 * Checks if a string is any valid IP address or CIDR notation.
 *
 * Accepts IPv4, IPv6, IPv4 CIDR, and IPv6 CIDR formats.
 *
 * @param s The string to validate
 * @returns `true` if the string is a valid IP address or CIDR notation
 *
 * @example Valid inputs
 * ```ts
 * import { assert } from "@std/assert";
 * import { isValid } from "@hertzg/ip/validate";
 *
 * assert(isValid("192.168.1.1"));
 * assert(isValid("::1"));
 * assert(isValid("10.0.0.0/8"));
 * assert(isValid("2001:db8::/32"));
 * ```
 *
 * @example Invalid inputs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValid } from "@hertzg/ip/validate";
 *
 * assertEquals(isValid(""), false);
 * assertEquals(isValid("not an ip"), false);
 * assertEquals(isValid("999.999.999.999"), false);
 * assertEquals(isValid("10.0.0.0/33"), false);
 * ```
 */
export function isValid(s: string): boolean {
  return validate(s).kind !== "invalid";
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
