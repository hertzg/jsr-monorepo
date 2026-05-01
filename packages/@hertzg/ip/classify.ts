/**
 * Universal IP address classification.
 *
 * This module provides a single {@link classifyIp} function that accepts
 * both IPv4 (`number`) and IPv6 (`bigint`) addresses and returns the
 * appropriate classification with version information and parsed value.
 *
 * For version-specific classifiers, see:
 * - [`classifyv4`](https://jsr.io/@hertzg/ip/doc/classifyv4): {@link classifyIpv4}, {@link isIpv4Private}, etc.
 * - [`classifyv6`](https://jsr.io/@hertzg/ip/doc/classifyv6): {@link classifyIpv6}, {@link isIpv6Loopback}, etc.
 *
 * @example Classify any IP address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * // IPv4 from parsed value
 * const v4 = classifyIp(parseIpv4("192.168.1.1"));
 * assertEquals(v4.kind, "ipv4");
 * assertEquals(v4.value, 3232235777);
 * assertEquals(v4.classification, "private");
 *
 * // IPv6 from parsed value
 * const v6 = classifyIp(parseIpv6("::1"));
 * assertEquals(v6.kind, "ipv6");
 * assertEquals(v6.value, 1n);
 * assertEquals(v6.classification, "loopback");
 *
 * // From string directly
 * const str4 = classifyIp("127.0.0.1");
 * assertEquals(str4.kind, "ipv4");
 * assertEquals(str4.classification, "loopback");
 *
 * const str6 = classifyIp("2001:db8::1");
 * assertEquals(str6.kind, "ipv6");
 * assertEquals(str6.classification, "documentation");
 * ```
 *
 * @module
 */

import { parseIp } from "./ip.ts";
import {
  classifyIpv4,
  type ClassificationIpv4,
} from "./classifyv4.ts";
import {
  classifyIpv6,
  type ClassificationIpv6,
} from "./classifyv6.ts";

export type { ClassificationIpv4, ClassificationIpv6 };

/**
 * Result of classifying an IPv4 address.
 *
 * Contains the parsed `value`, the `kind` discriminant `"ipv4"`,
 * and the `classification` label from {@link ClassificationIpv4}.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const result = classifyIp(parseIpv4("10.0.0.1"));
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.classification, "private");
 * ```
 */
export type ClassifiedIpv4 = {
  readonly kind: "ipv4";
  readonly value: number;
  readonly classification: ClassificationIpv4;
};

/**
 * Result of classifying an IPv6 address.
 *
 * Contains the parsed `value`, the `kind` discriminant `"ipv6"`,
 * and the `classification` label from {@link ClassificationIpv6}.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const result = classifyIp(parseIpv6("fe80::1"));
 * assertEquals(result.kind, "ipv6");
 * assertEquals(result.classification, "link-local");
 * ```
 */
export type ClassifiedIpv6 = {
  readonly kind: "ipv6";
  readonly value: bigint;
  readonly classification: ClassificationIpv6;
};

/**
 * Result of classifying an IP address with version information and parsed value.
 *
 * Discriminated union on `kind`:
 * - `"ipv4"` — see {@link ClassifiedIpv4}
 * - `"ipv6"` — see {@link ClassifiedIpv6}
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 *
 * const v4 = classifyIp("8.8.8.8");
 * assertEquals(v4.kind, "ipv4");
 * assertEquals(v4.classification, "public");
 *
 * const v6 = classifyIp("ff02::1");
 * assertEquals(v6.kind, "ipv6");
 * assertEquals(v6.classification, "multicast");
 * ```
 */
export type ClassifiedIp =
  | ClassifiedIpv4
  | ClassifiedIpv6;

/**
 * Classifies an IPv4 address into its well-known range.
 *
 * @param ip The IPv4 address as a 32-bit unsigned integer
 * @returns A {@link ClassifiedIpv4} with `kind`, `value`, and `classification`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const result = classifyIp(parseIpv4("192.168.1.1"));
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.value, 3232235777);
 * assertEquals(result.classification, "private");
 * ```
 */
export function classifyIp(ip: number): ClassifiedIpv4;
/**
 * Classifies an IPv6 address into its well-known range.
 *
 * @param ip The IPv6 address as a 128-bit bigint
 * @returns A {@link ClassifiedIpv6} with `kind`, `value`, and `classification`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const result = classifyIp(parseIpv6("fd00::1"));
 * assertEquals(result.kind, "ipv6");
 * assertEquals(result.classification, "unique-local");
 * ```
 */
export function classifyIp(ip: bigint): ClassifiedIpv6;
/**
 * Parses an IP address string and classifies it into its well-known range.
 *
 * The string is parsed using {@link parseIp} to detect IPv4 vs IPv6,
 * then classified accordingly.
 *
 * @param ip The IP address string in dotted decimal or colon-hexadecimal notation
 * @returns A {@link ClassifiedIp} with `kind`, `value`, and `classification`
 * @throws {TypeError} If the string is not a valid IP address
 * @throws {RangeError} If values are out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 *
 * const v4 = classifyIp("192.168.1.1");
 * assertEquals(v4.kind, "ipv4");
 * assertEquals(v4.classification, "private");
 *
 * const v6 = classifyIp("::1");
 * assertEquals(v6.kind, "ipv6");
 * assertEquals(v6.classification, "loopback");
 * ```
 */
export function classifyIp(ip: string): ClassifiedIp;
/**
 * Classifies an IPv4 or IPv6 address into its well-known range.
 *
 * This overload accepts `number | bigint`, which is the return type of
 * {@link parseIp}. At runtime, the value is dispatched to the
 * version-specific classifier based on its type.
 *
 * @param ip The IP address as a `number` (IPv4) or `bigint` (IPv6)
 * @returns A {@link ClassifiedIp} with `kind`, `value`, and `classification`
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { classifyIp } from "@hertzg/ip/classify";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * const result = classifyIp(parseIp("127.0.0.1"));
 * assertEquals(result.kind, "ipv4");
 * assertEquals(result.classification, "loopback");
 * ```
 */
export function classifyIp(ip: number | bigint): ClassifiedIp;
export function classifyIp(ip: number | bigint | string): ClassifiedIp {
  if (typeof ip === "string") {
    return classifyIp(parseIp(ip));
  }
  if (typeof ip === "bigint") {
    return { kind: "ipv6", value: ip, classification: classifyIpv6(ip) };
  }
  return { kind: "ipv4", value: ip, classification: classifyIpv4(ip) };
}
