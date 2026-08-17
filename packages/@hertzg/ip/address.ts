/**
 * Universal IP address parsing and stringifying.
 *
 * This module provides {@link parseAddress}, {@link stringifyAddress} and
 * {@link compareAddress} that auto-detect IPv4 vs IPv6 and delegate to the
 * appropriate version-specific function. The {@link Address} and
 * {@link ParsedAddress} type aliases are also exported for working with
 * version-polymorphic address values.
 *
 * For version-specific functions, see:
 * - [`addressv4`](https://jsr.io/@hertzg/ip/doc/addressv4): {@link parseAddressv4}, {@link stringifyAddressv4}, {@link compareAddressv4}
 * - [`addressv6`](https://jsr.io/@hertzg/ip/doc/addressv6): {@link parseAddressv6}, {@link stringifyAddressv6}, {@link compareAddressv6}
 *
 * @example Parse and stringify any IP address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress, stringifyAddress } from "@hertzg/ip/address";
 *
 * // IPv4
 * const v4 = parseAddress("192.168.1.1");
 * assertEquals(v4, { address: 3232235777 });
 * assertEquals(stringifyAddress(v4), "192.168.1.1");
 *
 * // IPv6
 * const v6 = parseAddress("2001:db8::1");
 * assertEquals(v6, { address: 42540766411282592856903984951653826561n });
 * assertEquals(stringifyAddress(v6), "2001:db8::1");
 *
 * // A zone ID rides along
 * const linkLocal = parseAddress("fe80::1%eth0");
 * assertEquals(linkLocal, { address: 0xfe800000000000000000000000000001n, zoneId: "eth0" });
 * assertEquals(stringifyAddress(linkLocal), "fe80::1%eth0");
 * ```
 *
 * @module
 */

import { isAddressv6Mapped } from "./classifyv6.ts";
import {
  type Addressv4,
  compareAddressv4,
  parseAddressv4,
  type ParsedAddressv4,
  stringifyAddressv4,
} from "./addressv4.ts";
import {
  type Addressv6,
  compareAddressv6,
  parseAddressv6,
  type ParsedAddressv6,
  stringifyAddressv6,
  unmapToAddressv4,
} from "./addressv6.ts";
import { splitNotation } from "./notation.ts";

export type {
  /** An IPv4 address as a 32-bit unsigned integer. */
  Addressv4,
  /** What parseAddressv4 returns: the address and an optional zone ID. */
  ParsedAddressv4,
} from "./addressv4.ts";
export type {
  /** An IPv6 address as a 128-bit unsigned bigint. */
  Addressv6,
  /** What parseAddressv6 returns: the address and an optional zone ID. */
  ParsedAddressv6,
} from "./addressv6.ts";
export type {
  /** The zone ID after `%`, a string. */
  ZoneId,
} from "./notation.ts";

/**
 * A plain IP address of either IP version.
 *
 * This is a union of {@link Addressv4} (`number`, 32-bit) and
 * {@link Addressv6} (`bigint`, 128-bit) -- the JS primitive type is what
 * carries the version. Useful for functions that operate on addresses
 * regardless of IP version; narrow with a `typeof` check.
 */
export type Address = Addressv4 | Addressv6;

/**
 * What {@link parseAddress} returns and what {@link stringifyAddress}
 * accepts: a {@link ParsedAddressv4} or a {@link ParsedAddressv6}. Read
 * `.address` for the bare {@link Address} and narrow with `typeof`; the
 * zone never touches the value, and no operation in this package reads it.
 */
export type ParsedAddress = ParsedAddressv4 | ParsedAddressv6;

/**
 * Options for the universal parsers, {@link parseAddress} and
 * {@link parseCidr}. The version-specific parsers take none: they return
 * their own version and nothing else.
 */
export type ParseOptions = {
  /**
   * Whether an IPv4-mapped IPv6 address (`::ffff:a.b.c.d`) is returned as
   * the IPv4 value it carries. Defaults to `true` (ADR 0004): dual-stack
   * listeners report IPv4 clients in the mapped form, and almost every
   * caller wants the IPv4 view. Set to `false` to keep the `bigint`.
   */
  readonly unmapToV4?: boolean;
};

/**
 * Parses an IPv4 or IPv6 address string, with an optional zone ID, to its
 * numeric value.
 *
 * Detects the IP version from the address slot -- a `:` means IPv6
 * (`bigint`), otherwise IPv4 (`number`) -- and hands the string to
 * {@link parseAddressv6} or {@link parseAddressv4}, so the accepted grammar
 * is exactly theirs: RFC 4291 / dotted decimal, an optional `%zoneId`
 * carried verbatim, no prefix.
 *
 * IPv4-mapped IPv6 addresses (`::ffff:a.b.c.d`) are unmapped to their IPv4
 * `number` by default (ADR 0004); pass `{ unmapToV4: false }` to keep the
 * `bigint`, or use {@link parseAddressv6}, which never unmaps. The zone ID,
 * if any, is carried either way.
 *
 * @param address The address string in dotted decimal or colon-hexadecimal notation, with an optional `%zoneId`
 * @param options `unmapToV4`, default `true`
 * @returns The parsed address as `number` (IPv4) or `bigint` (IPv6), and the zone ID if there was one
 * @throws {TypeError} If the format is invalid, including a prefix
 * @throws {RangeError} If a well-formed number is out of range
 *
 * @example Both versions
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(parseAddress("10.0.0.1"), { address: 167772161 });
 * assertEquals(parseAddress("::1"), { address: 1n });
 * assertEquals(parseAddress("192.168.1.1%ether1"), { address: 3232235777, zoneId: "ether1" });
 * assertEquals(parseAddress("fe80::1%eth0"), { address: 0xfe800000000000000000000000000001n, zoneId: "eth0" });
 * ```
 *
 * @example IPv4-mapped addresses unmap by default
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(parseAddress("::ffff:192.168.1.1"), { address: 3232235777 });
 * assertEquals(parseAddress("::ffff:192.168.1.1", { unmapToV4: false }), { address: 0xffffc0a80101n });
 * assertEquals(parseAddress("::ffff:192.168.1.1%eth0"), { address: 3232235777, zoneId: "eth0" });
 * ```
 *
 * @example A prefix is not an address
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertThrows(() => parseAddress("10.0.0.0/8"), TypeError);
 * assertThrows(() => parseAddress("fe80::%eth0/64"), TypeError);
 * ```
 */
export function parseAddress(
  address: string,
  options?: ParseOptions,
): ParsedAddress {
  if (!splitNotation(address).address.includes(":")) {
    return parseAddressv4(address);
  }
  const parsed = parseAddressv6(address);
  if (options?.unmapToV4 === false || !isAddressv6Mapped(parsed.address)) {
    return parsed;
  }
  return { ...parsed, address: unmapToAddressv4(parsed.address) };
}

/**
 * Stringifies an IPv4 (`number`) or IPv6 (`bigint`) address, bare or
 * parsed, to its standard notation.
 *
 * Dispatches on `typeof address`: numbers are written as dotted decimal,
 * bigints as compressed colon-hexadecimal. Given a {@link ParsedAddress},
 * a truthy `zoneId` is appended after `%`, so `stringifyAddress(parseAddress(s))`
 * gives back `s` for every accepted `s` in canonical form. `zoneId` must
 * not contain `%`, `/` or whitespace; see {@link stringifyAddressv6}.
 *
 * Since {@link parseAddress} unmaps IPv4-mapped IPv6 addresses to numbers,
 * round-tripping a mapped address through `parseAddress`/`stringifyAddress`
 * produces the IPv4 form (e.g. `"192.168.1.1"`, not `"::ffff:c0a8:101"`).
 * To produce the mapped IPv6 representation, use {@link mapFromAddressv4}
 * with {@link stringifyAddressv6}.
 *
 * @param address The address as a `number` (IPv4) or `bigint` (IPv6), or a parse result
 * @returns The address string in dotted decimal or compressed colon-hexadecimal notation, `%zoneId` appended when there is one
 * @throws {RangeError} If the address is out of range
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress, stringifyAddress } from "@hertzg/ip/address";
 *
 * assertEquals(stringifyAddress(167772161), "10.0.0.1");
 * assertEquals(stringifyAddress(1n), "::1");
 * assertEquals(stringifyAddress(parseAddress("fe80::1%eth0")), "fe80::1%eth0");
 * assertEquals(stringifyAddress(parseAddress("192.168.1.1%ether1")), "192.168.1.1%ether1");
 * ```
 *
 * @example Producing the mapped IPv6 representation
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseAddress, stringifyAddress } from "@hertzg/ip/address";
 * import { mapFromAddressv4, stringifyAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const { address } = parseAddress("::ffff:192.168.1.1");
 * assertEquals(stringifyAddress(address), "192.168.1.1");
 * assertEquals(stringifyAddressv6(mapFromAddressv4(address as number)), "::ffff:c0a8:101");
 * ```
 */
export function stringifyAddress(address: Address | ParsedAddress): string {
  if (typeof address === "object") {
    const text = stringifyAddress(address.address);
    return address.zoneId ? `${text}%${address.zoneId}` : text;
  }
  if (typeof address === "bigint") {
    return stringifyAddressv6(address);
  }
  return stringifyAddressv4(address);
}

/**
 * Compares two IP addresses of either version for sorting.
 *
 * The order is **version-first and total**: every IPv4 address (`number`)
 * sorts before every IPv6 address (`bigint`), and within a version
 * addresses sort numerically ascending. Mixed-version arguments are not an
 * error — unlike the universal CIDR operations, this function never throws,
 * because sorting a mixed dual-stack list is the reason it exists. Go's
 * `net/netip`, Rust's `std::net::IpAddr` and PostgreSQL's `inet` all order
 * addresses the same way.
 *
 * Note that "IPv4 sorts first" is a statement about order, not about
 * magnitude: the two address spaces are disjoint and nothing is converted
 * between them. An IPv4-mapped address held as a `bigint` is an IPv6 value
 * and sorts in the IPv6 half — see the example below. In practice
 * {@link parseAddress} already unwraps mapped addresses to their IPv4 `number`
 * form, so a mapped `bigint` only reaches this function via
 * {@link parseAddressv6}.
 *
 * @param a The first address
 * @param b The second address
 * @returns `-1` if `a` sorts before `b`, `1` if after, `0` if equal
 *
 * @example Sort a mixed dual-stack list, ascending or descending
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddress, parseAddress, stringifyAddress } from "@hertzg/ip/address";
 *
 * const clients = ["2001:db8::1", "10.0.0.2", "::1", "10.0.0.1"].map((s) => parseAddress(s).address);
 *
 * assertEquals(clients.toSorted(compareAddress).map(stringifyAddress), [
 *   "10.0.0.1",
 *   "10.0.0.2",
 *   "::1",
 *   "2001:db8::1",
 * ]);
 *
 * // Descending: swap the arguments
 * assertEquals(clients.toSorted((a, b) => compareAddress(b, a)).map(stringifyAddress), [
 *   "2001:db8::1",
 *   "::1",
 *   "10.0.0.2",
 *   "10.0.0.1",
 * ]);
 * ```
 *
 * @example Every IPv4 address sorts before every IPv6 address
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddress, parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(compareAddress(parseAddress("255.255.255.255").address, parseAddress("::").address), -1);
 * assertEquals(compareAddress(parseAddress("::").address, parseAddress("0.0.0.0").address), 1);
 * ```
 *
 * @example An IPv4-mapped bigint is an IPv6 value, not its IPv4 twin
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { compareAddress } from "@hertzg/ip/address";
 * import { parseAddressv4 } from "@hertzg/ip/addressv4";
 * import { parseAddressv6 } from "@hertzg/ip/addressv6";
 *
 * const mapped = parseAddressv6("::ffff:10.0.0.1").address;
 * const plain = parseAddressv4("10.0.0.1").address;
 *
 * assertEquals(compareAddress(mapped, plain), 1);
 * ```
 */
export function compareAddress(a: Address, b: Address): -1 | 0 | 1 {
  if (typeof a === "number") {
    return typeof b === "number" ? compareAddressv4(a, b) : -1;
  }
  return typeof b === "bigint" ? compareAddressv6(a, b) : 1;
}
