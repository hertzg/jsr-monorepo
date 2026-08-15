/**
 * IP version detection for address and CIDR strings.
 *
 * This module provides {@link ipVersion} and {@link cidrVersion}, which report
 * whether a string is written as IPv4 or IPv6, or `undefined` when it is
 * neither. They answer in one call what would otherwise take two
 * version-specific validity checks before picking a parser.
 *
 * @example Dispatching on the IP version
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipVersion } from "@hertzg/ip/version";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const describe = (input: string): string => {
 *   switch (ipVersion(input)) {
 *     case 4:
 *       return `v4:${parseIpv4(input)}`;
 *     case 6:
 *       return `v6:${parseIpv6(input)}`;
 *     default:
 *       return "not an address";
 *   }
 * };
 *
 * assertEquals(describe("10.0.0.1"), "v4:167772161");
 * assertEquals(describe("::1"), "v6:1");
 * assertEquals(describe("nonsense"), "not an address");
 * ```
 *
 * @module
 */

import { isValidCidrv4, isValidIpv4 } from "./validatev4.ts";
import { isValidCidrv6, isValidIpv6 } from "./validatev6.ts";

/**
 * An IP version number: `4` for IPv4, `6` for IPv6.
 *
 * Returned by {@link ipVersion} and {@link cidrVersion}, which widen it with
 * `undefined` for input that is not an address or CIDR block at all.
 */
export type IpVersion = 4 | 6;

/**
 * Reports which IP version a plain address string is written in.
 *
 * Returns `4` for dotted decimal, `6` for colon-hexadecimal, and `undefined`
 * for anything else — never `0`, so the answer cannot be mistaken for a
 * version number in a numeric context.
 *
 * The answer describes the **string**, not the value it would parse to. An
 * IPv4-mapped IPv6 address such as `::ffff:10.1.2.3` is written as IPv6 and
 * reports `6`, even though {@link parseIp} unwraps it to an IPv4 `number`.
 * Version `n` always means "{@link parseIpv4} / {@link parseIpv6} for that
 * version accepts this string". To get the version of an already parsed
 * value, use `typeof` — `number` is IPv4, `bigint` is IPv6.
 *
 * CIDR notation is not an address — use {@link cidrVersion} for that.
 *
 * What counts as valid is exactly what {@link isValidIpv4} and
 * {@link isValidIpv6} accept, which is looser than some other libraries:
 * surrounding whitespace and trailing text are tolerated by the parsers
 * underneath, so `ipVersion(" 10.1.2.3")` is `4`.
 *
 * @param address The address string to inspect
 * @returns `4`, `6`, or `undefined` if the string is not a plain IP address
 *
 * @example Both versions and the reject case
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipVersion } from "@hertzg/ip/version";
 *
 * assertEquals(ipVersion("10.1.2.3"), 4);
 * assertEquals(ipVersion("::1"), 6);
 * assertEquals(ipVersion("fe80::1%eth0"), 6);
 * assertEquals(ipVersion("notanip"), undefined);
 * assertEquals(ipVersion("10.0.0.0/8"), undefined);
 * ```
 *
 * @example IPv4-mapped IPv6 is written as IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipVersion } from "@hertzg/ip/version";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(ipVersion("::ffff:10.1.2.3"), 6);
 * assertEquals(typeof parseIp("::ffff:10.1.2.3"), "number");
 * ```
 */
export function ipVersion(address: string): IpVersion | undefined {
  if (address.includes(":")) return isValidIpv6(address) ? 6 : undefined;
  return isValidIpv4(address) ? 4 : undefined;
}

/**
 * Reports which IP version a CIDR notation string is written in.
 *
 * The CIDR counterpart of {@link ipVersion}, with the same contract: `4`,
 * `6`, or `undefined`, describing the string rather than the parsed value.
 * A plain address without a prefix length is not CIDR notation.
 *
 * @param cidr The CIDR string to inspect
 * @returns `4`, `6`, or `undefined` if the string is not CIDR notation
 *
 * @example Both versions and the reject case
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cidrVersion } from "@hertzg/ip/version";
 *
 * assertEquals(cidrVersion("10.0.0.0/8"), 4);
 * assertEquals(cidrVersion("2001:db8::/32"), 6);
 * assertEquals(cidrVersion("10.0.0.0"), undefined);
 * assertEquals(cidrVersion("10.0.0.0/33"), undefined);
 * assertEquals(cidrVersion("garbage/24"), undefined);
 * ```
 */
export function cidrVersion(cidr: string): IpVersion | undefined {
  if (cidr.includes(":")) return isValidCidrv6(cidr) ? 6 : undefined;
  return isValidCidrv4(cidr) ? 4 : undefined;
}
