/**
 * Universal conversion between IP addresses and their network-order wire
 * bytes.
 *
 * This module provides {@link ipFromBytes} and {@link ipToBytes}, which pick
 * the IP version from the shape of their argument and delegate to the
 * version-specific function. Addresses keep the numeric representation of the
 * rest of the package — `number` for IPv4, `bigint` for IPv6. Bytes are a
 * conversion, not a third representation.
 *
 * For version-specific functions, see:
 * - [`bytesv4`](https://jsr.io/@hertzg/ip/doc/bytesv4): {@link ipv4FromBytes}, {@link ipv4ToBytes}
 * - [`bytesv6`](https://jsr.io/@hertzg/ip/doc/bytesv6): {@link ipv6FromBytes}, {@link ipv6ToBytes}
 *
 * ## Byte order
 *
 * Always network order (big-endian), on both the read and the write side.
 * There is no option, because an IP address has exactly one wire order.
 *
 * ## Picking the version
 *
 * {@link ipFromBytes} reads the version off the **span width**, which must be
 * exactly 4 or 16 bytes; anything else throws rather than guessing.
 * {@link ipToBytes} reads it off the **type** of the address, the same
 * `typeof` dispatch {@link stringifyIp} uses.
 *
 * Decoders that already know the version and the field offset want the
 * version-specific functions, where the width is fixed by the function rather
 * than inferred from the buffer.
 *
 * @example Read and write without knowing the version up front
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipFromBytes, ipToBytes } from "@hertzg/ip/bytes";
 * import { stringifyIp } from "@hertzg/ip/ip";
 *
 * const field = new Uint8Array([10, 0, 0, 1]);
 * assertEquals(stringifyIp(ipFromBytes(field)), "10.0.0.1");
 *
 * // The width comes back out unchanged
 * assertEquals(ipToBytes(ipFromBytes(field)), field);
 * ```
 *
 * @module
 */

import { IPV4_BYTE_LENGTH, IPV6_BYTE_LENGTH } from "./_bytes.ts";
import { ipv4FromBytes, ipv4ToBytes } from "./bytesv4.ts";
import { ipv6FromBytes, ipv6ToBytes } from "./bytesv6.ts";
import type { Address } from "./ip.ts";

/**
 * Reads an IPv4 or IPv6 address from a buffer, picking the version from the
 * width of the span.
 *
 * The span is `bytes.length - offset`, and it must be **exactly** 4 bytes
 * (read as IPv4, returning `number`) or **exactly** 16 (read as IPv6,
 * returning `bigint`). Any other width throws a `RangeError` rather than
 * guessing: a 60-byte frame at offset 12 leaves a 48-byte span, which names no
 * version. Decoders that know the version and the field offset want
 * {@link ipv4FromBytes} or {@link ipv6FromBytes}, where the width is fixed by
 * the function.
 *
 * Unlike {@link parseIp}, this does **not** unwrap IPv4-mapped addresses.
 * Sixteen bytes always return a `bigint`, so that
 * `ipToBytes(ipFromBytes(b)).length === b.length`. Callers wanting the
 * dual-stack normalization compose {@link ipv4From64Mapped} explicitly.
 *
 * @param bytes The buffer to read from
 * @param offset The offset the span starts at, defaulting to `0`
 * @returns The address as `number` (IPv4) or `bigint` (IPv6)
 * @throws {RangeError} If the span is neither 4 nor 16 bytes wide
 *
 * @example The span width picks the version
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipFromBytes } from "@hertzg/ip/bytes";
 * import { stringifyIp } from "@hertzg/ip/ip";
 *
 * assertEquals(stringifyIp(ipFromBytes(new Uint8Array([10, 0, 0, 1]))), "10.0.0.1");
 * assertEquals(stringifyIp(ipFromBytes(new Uint8Array(16))), "::");
 * ```
 *
 * @example Sixteen mapped bytes stay IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipFromBytes, ipToBytes } from "@hertzg/ip/bytes";
 * import { ipv4From64Mapped } from "@hertzg/ip/4to6";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * // deno-fmt-ignore
 * const mapped = new Uint8Array([
 *   0, 0, 0, 0, 0, 0, 0, 0,
 *   0, 0, 0xff, 0xff, 192, 168, 1, 1,
 * ]);
 *
 * const address = ipFromBytes(mapped);
 * assertEquals(typeof address, "bigint");
 * assertEquals(ipToBytes(address).length, 16);
 *
 * // Normalizing to IPv4 is an explicit, separate step
 * assertEquals(stringifyIpv4(ipv4From64Mapped(address as bigint)), "192.168.1.1");
 * ```
 *
 * @example Any other span width throws instead of guessing
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { ipFromBytes } from "@hertzg/ip/bytes";
 *
 * assertThrows(() => ipFromBytes(new Uint8Array(20)), RangeError);
 * assertThrows(() => ipFromBytes(new Uint8Array(20), 12), RangeError);
 * assertThrows(() => ipFromBytes(new Uint8Array(6)), RangeError);
 *
 * // ...but a slice of exactly one address is fine, offset or not
 * ipFromBytes(new Uint8Array(20), 16);
 * ```
 */
export function ipFromBytes(bytes: Uint8Array, offset = 0): Address {
  const span = bytes.length - offset;
  if (offset < 0 || (span !== IPV4_BYTE_LENGTH && span !== IPV6_BYTE_LENGTH)) {
    throw new RangeError(
      `IP address needs a span of exactly ${IPV4_BYTE_LENGTH} or ${IPV6_BYTE_LENGTH} bytes, but offset ${offset} of a ${bytes.length}-byte buffer leaves ${span}`,
    );
  }

  return span === IPV4_BYTE_LENGTH
    ? ipv4FromBytes(bytes, offset)
    : ipv6FromBytes(bytes, offset);
}

/** Writes an IP address into a freshly allocated buffer of its wire width. */
export function ipToBytes(address: Address): Uint8Array;
/** Writes an IP address into an existing buffer at `offset`. */
export function ipToBytes(
  address: Address,
  into: Uint8Array,
  offset?: number,
): Uint8Array;
/**
 * Writes an IPv4 or IPv6 address, either into a fresh buffer or into one you
 * supply.
 *
 * The width comes from the type of `address` — 4 bytes for a `number`, 16 for
 * a `bigint` — the same `typeof` dispatch {@link stringifyIp} uses. The
 * address is written in network order (big-endian), and the return value is
 * always exactly the bytes written, so `result.length` tells you the width.
 * When `into` is given the return is a **view** into it, never the whole of
 * it.
 *
 * @param address The address as a `number` (IPv4) or `bigint` (IPv6)
 * @param into The buffer to write into; one of the address's wire width is
 *   allocated when omitted
 * @param offset The offset within `into` to write at, defaulting to `0`
 * @returns The bytes written — 4 for IPv4, 16 for IPv6
 * @throws {RangeError} If the address is out of range, or its width is not
 *   available at `offset`
 *
 * @example The address type picks the width
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipToBytes } from "@hertzg/ip/bytes";
 * import { parseIp } from "@hertzg/ip/ip";
 *
 * assertEquals(ipToBytes(parseIp("10.0.0.1")), new Uint8Array([10, 0, 0, 1]));
 * assertEquals(ipToBytes(parseIp("::1")).length, 16);
 * ```
 *
 * @example Round-tripping a packet field
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipFromBytes, ipToBytes } from "@hertzg/ip/bytes";
 *
 * const field = new Uint8Array([192, 168, 1, 1]);
 * assertEquals(ipToBytes(ipFromBytes(field)), field);
 * ```
 */
export function ipToBytes(
  address: Address,
  into?: Uint8Array,
  offset = 0,
): Uint8Array {
  // The delegates deliberately publish no overload taking `into?`, so that
  // `(address, undefined, 8)` — an offset with nothing to apply it to — is a
  // compile error. That costs this dispatcher an extra fork; both arms of it
  // reach the same code.
  if (typeof address === "bigint") {
    return into === undefined
      ? ipv6ToBytes(address)
      : ipv6ToBytes(address, into, offset);
  }
  return into === undefined
    ? ipv4ToBytes(address)
    : ipv4ToBytes(address, into, offset);
}
