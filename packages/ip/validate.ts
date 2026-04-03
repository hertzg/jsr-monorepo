/**
 * Universal IP address and CIDR validation utilities.
 *
 * This module provides a universal {@link validateIp} function that identifies
 * and parses any valid IP or CIDR string, and an {@link isValidIp} function
 * that checks if a string is any valid format.
 *
 * For version-specific validators, see:
 * - [`ipv4`](https://jsr.io/@hertzg/ip/doc/ipv4): {@link isValidIpv4}
 * - [`ipv6`](https://jsr.io/@hertzg/ip/doc/ipv6): {@link isValidIpv6}
 * - [`cidrv4`](https://jsr.io/@hertzg/ip/doc/cidrv4): {@link isValidCidrv4}
 * - [`cidrv6`](https://jsr.io/@hertzg/ip/doc/cidrv6): {@link isValidCidr6}
 *
 * @example Universal validation
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isValidIp, validateIp } from "@hertzg/ip/validate";
 *
 * assert(isValidIp("192.168.1.1"));
 * assert(isValidIp("::1"));
 * assert(isValidIp("10.0.0.0/8"));
 * assertEquals(isValidIp("garbage"), false);
 *
 * const r = validateIp("192.168.1.1");
 * assertEquals(r.kind, "ipv4");
 * ```
 *
 * @module
 */

import { parseIpv4 } from "./ipv4.ts";
import { parseIpv6 } from "./ipv6.ts";
import { type Cidrv4, parseCidrv4 } from "./cidrv4.ts";
import { type Cidr6, parseCidr6 } from "./cidrv6.ts";

/**
 * The result of the {@link validateIp} function.
 *
 * Discriminated union on `kind`:
 * - `"ipv4"` — valid IPv4 address with parsed `value` as a 32-bit number
 * - `"ipv6"` — valid IPv6 address with parsed `value` as a 128-bit bigint
 * - `"cidr4"` — valid IPv4 CIDR with parsed `value` as a {@link Cidrv4}
 * - `"cidr6"` — valid IPv6 CIDR with parsed `value` as a {@link Cidr6}
 * - `"invalid"` — the string is not a valid IP address or CIDR notation
 */
export type IpValidationResult =
  | { readonly kind: "ipv4"; readonly value: number }
  | { readonly kind: "ipv6"; readonly value: bigint }
  | { readonly kind: "cidr4"; readonly value: Cidrv4 }
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
 * import { isValidIp } from "@hertzg/ip/validate";
 *
 * assert(isValidIp("192.168.1.1"));
 * assert(isValidIp("::1"));
 * assert(isValidIp("10.0.0.0/8"));
 * assert(isValidIp("2001:db8::/32"));
 * ```
 *
 * @example Invalid inputs
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidIp } from "@hertzg/ip/validate";
 *
 * assertEquals(isValidIp(""), false);
 * assertEquals(isValidIp("not an ip"), false);
 * assertEquals(isValidIp("999.999.999.999"), false);
 * assertEquals(isValidIp("10.0.0.0/33"), false);
 * ```
 */
export function isValidIp(s: string): boolean {
  return validateIp(s).kind !== "invalid";
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
 * @returns An {@link IpValidationResult} with the parsed value, or `{ kind: "invalid" }`
 *
 * @example Identify and use parsed values
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validateIp } from "@hertzg/ip/validate";
 *
 * const ipv4 = validateIp("192.168.1.1");
 * assertEquals(ipv4.kind, "ipv4");
 * if (ipv4.kind === "ipv4") {
 *   assertEquals(ipv4.value, 3232235777);
 * }
 *
 * const ipv6 = validateIp("::1");
 * assertEquals(ipv6.kind, "ipv6");
 * if (ipv6.kind === "ipv6") {
 *   assertEquals(ipv6.value, 1n);
 * }
 *
 * const cidr4 = validateIp("10.0.0.0/8");
 * assertEquals(cidr4.kind, "cidr4");
 * if (cidr4.kind === "cidr4") {
 *   assertEquals(cidr4.value.prefixLength, 8);
 * }
 *
 * const cidr6 = validateIp("2001:db8::/32");
 * assertEquals(cidr6.kind, "cidr6");
 * if (cidr6.kind === "cidr6") {
 *   assertEquals(cidr6.value.prefixLength, 32);
 * }
 *
 * assertEquals(validateIp("garbage").kind, "invalid");
 * ```
 *
 * @example Use in input handling
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { validateIp } from "@hertzg/ip/validate";
 *
 * const result = validateIp("fe80::1");
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
export function validateIp(s: string): IpValidationResult {
  if (s.includes("/")) {
    try {
      return { kind: "cidr4", value: parseCidrv4(s) };
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
