/**
 * Universal IP address classification.
 *
 * This module provides a single {@link classifyAddress} function that accepts
 * both IPv4 (`number`) and IPv6 (`bigint`) addresses and returns the
 * appropriate classification with version information and parsed value.
 *
 * For version-specific classifiers, see:
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): {@link classifyAddressv4}, {@link isAddressv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): {@link classifyAddressv6}, {@link isAddressv6Loopback}, etc.
 *
 * @example Classify any IP address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * // IPv4 from parsed value
 * const v4 = classifyAddress(parseAddressv4("192.168.1.1"));
 * assertEquals(v4.kind, "ipv4");
 * assertEquals(v4.value, 3232235777);
 * assertEquals(v4.classification, "private");
 *
 * // IPv6 from parsed value
 * const v6 = classifyAddress(parseAddressv6("::1"));
 * assertEquals(v6.kind, "ipv6");
 * assertEquals(v6.value, 1n);
 * assertEquals(v6.classification, "loopback");
 *
 * // From string directly
 * const str4 = classifyAddress("127.0.0.1");
 * assertEquals(str4.kind, "ipv4");
 * assertEquals(str4.classification, "loopback");
 *
 * const str6 = classifyAddress("2001:db8::1");
 * assertEquals(str6.kind, "ipv6");
 * assertEquals(str6.classification, "documentation");
 * ```
 *
 * @module
 */

import { type Address, parseAddress } from "./address.ts";
import { type Classificationv4, classifyAddressv4 } from "./classifyv4.ts";
import { type Classificationv6, classifyAddressv6 } from "./classifyv6.ts";

export type {
  /** A plain IP address of either IP version. */
  Address,
  /** Type for all IPv4 classification labels. */
  Classificationv4,
  /** Type for all IPv6 classification labels. */
  Classificationv6,
};

/**
 * Result of classifying an IPv4 address.
 *
 * Contains the parsed `value`, the `kind` discriminant `"ipv4"`,
 * and the `classification` label from {@link Classificationv4}.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const result = classifyAddress(parseAddressv4("10.0.0.1"));
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.classification, "private");
 * ```
 */
export type ClassifiedAddressv4 = {
  readonly kind: "ipv4";
  readonly value: number;
  readonly classification: Classificationv4;
};

/**
 * Result of classifying an IPv6 address.
 *
 * Contains the parsed `value`, the `kind` discriminant `"ipv6"`,
 * and the `classification` label from {@link Classificationv6}.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const result = classifyAddress(parseAddressv6("fe80::1"));
 * assertEquals(result.kind, "ipv6");
 * assertEquals(result.classification, "link-local");
 * ```
 */
export type ClassifiedAddressv6 = {
  readonly kind: "ipv6";
  readonly value: bigint;
  readonly classification: Classificationv6;
};

/**
 * Result of classifying an IP address with version information and parsed value.
 *
 * Discriminated union on `kind`:
 * - `"ipv4"` — see {@link ClassifiedAddressv4}
 * - `"ipv6"` — see {@link ClassifiedAddressv6}
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 *
 * const v4 = classifyAddress("8.8.8.8");
 * assertEquals(v4.kind, "ipv4");
 * assertEquals(v4.classification, "public");
 *
 * const v6 = classifyAddress("ff02::1");
 * assertEquals(v6.kind, "ipv6");
 * assertEquals(v6.classification, "multicast");
 * ```
 */
export type ClassifiedAddress =
  | ClassifiedAddressv4
  | ClassifiedAddressv6;

/**
 * Classifies an IPv4 address into its well-known range.
 *
 * @param address The address as a 32-bit unsigned integer
 * @returns A {@link ClassifiedAddressv4} with `kind`, `value`, and `classification`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 *
 * const result = classifyAddress(parseAddressv4("192.168.1.1"));
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.value, 3232235777);
 * assertEquals(result.classification, "private");
 * ```
 */
export function classifyAddress(address: number): ClassifiedAddressv4;
/**
 * Classifies an IPv6 address into its well-known range.
 *
 * @param address The address as a 128-bit bigint
 * @returns A {@link ClassifiedAddressv6} with `kind`, `value`, and `classification`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const result = classifyAddress(parseAddressv6("fd00::1"));
 * assertEquals(result.kind, "ipv6");
 * assertEquals(result.classification, "unique-local");
 * ```
 */
export function classifyAddress(address: bigint): ClassifiedAddressv6;
/**
 * Parses an IP address string and classifies it into its well-known range.
 *
 * The string is parsed using {@link parseAddress} to detect IPv4 vs IPv6,
 * then classified accordingly.
 *
 * @param address The address string in dotted decimal or colon-hexadecimal notation
 * @returns A {@link ClassifiedAddress} with `kind`, `value`, and `classification`
 * @throws {TypeError} If the string is not a valid IP address
 * @throws {RangeError} If values are out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 *
 * const v4 = classifyAddress("192.168.1.1");
 * assertEquals(v4.kind, "ipv4");
 * assertEquals(v4.classification, "private");
 *
 * const v6 = classifyAddress("::1");
 * assertEquals(v6.kind, "ipv6");
 * assertEquals(v6.classification, "loopback");
 * ```
 */
export function classifyAddress(address: string): ClassifiedAddress;
/**
 * Classifies an IPv4 or IPv6 address into its well-known range.
 *
 * This overload accepts an {@link Address}, which is the return type of
 * {@link parseAddress}. At runtime, the address is dispatched to the
 * version-specific classifier based on its type.
 *
 * @param address The address as a `number` (IPv4) or `bigint` (IPv6)
 * @returns A {@link ClassifiedAddress} with `kind`, `value`, and `classification`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyAddress } from "@hertzg/ip/classify";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * const result = classifyAddress(parseAddress("127.0.0.1"));
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.classification, "loopback");
 * ```
 */
export function classifyAddress(address: Address): ClassifiedAddress;
/** Classifies an IPv4 or IPv6 address, or parses and classifies an IP address string. */
export function classifyAddress(address: Address | string): ClassifiedAddress {
  if (typeof address === "string") {
    return classifyAddress(parseAddress(address));
  }
  if (typeof address === "bigint") {
    return {
      kind: "ipv6",
      value: address,
      classification: classifyAddressv6(address),
    };
  }
  return {
    kind: "ipv4",
    value: address,
    classification: classifyAddressv4(address),
  };
}
