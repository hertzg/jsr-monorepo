/**
 * Universal conversion between IP addresses and their network-order wire
 * bytes.
 *
 * This module provides {@link addressFromBytes} and {@link addressToBytes}, which pick
 * the IP version from the shape of their argument and delegate to the
 * version-specific function. Addresses keep the numeric representation of the
 * rest of the package — `number` for IPv4, `bigint` for IPv6. Bytes are a
 * conversion, not a third representation.
 *
 * For version-specific functions, see:
 * - [`bytesv4`](https://jsr.io/@hertzg/ip/doc/bytesv4): {@link addressv4FromBytes}, {@link addressv4ToBytes}
 * - [`bytesv6`](https://jsr.io/@hertzg/ip/doc/bytesv6): {@link addressv6FromBytes}, {@link addressv6ToBytes}
 *
 * ## Byte order
 *
 * Always network order (big-endian), on both the read and the write side.
 * There is no option, because an IP address has exactly one wire order.
 *
 * ## Picking the version
 *
 * {@link addressFromBytes} reads the version off the **length** of the buffer,
 * which must be exactly 4 or 16 bytes; anything else throws rather than
 * guessing. It takes no `offset` — an offset would let the amount of trailing
 * data decide the version, so pass exact bytes (`packet.subarray(12, 16)`, a
 * view rather than a copy). {@link addressToBytes} reads the version off the
 * **type** of the address, the same `typeof` dispatch {@link stringifyAddress}
 * uses, and does take `into` and `offset`, since its width comes from the
 * address rather than from the buffer.
 *
 * Decoders that already know the version and the field offset want the
 * version-specific functions, where the width is fixed by the function rather
 * than inferred from the buffer.
 *
 * @example Read and write without knowing the version up front
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressFromBytes, addressToBytes } from "@hertzg/ip/bytes";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * const field = new Uint8Array([10, 0, 0, 1]);
 * assertEquals(stringifyAddress(addressFromBytes(field)), "10.0.0.1");
 *
 * // The width comes back out unchanged
 * assertEquals(addressToBytes(addressFromBytes(field)), field);
 * ```
 *
 * @module
 */

import { addressv4FromBytes, addressv4ToBytes } from "./bytesv4.ts";
import { addressv6FromBytes, addressv6ToBytes } from "./bytesv6.ts";
import type { Address } from "./address.ts";

/** The wire width of an IPv4 address, in bytes. */
const IPV4_BYTE_LENGTH = 4;

/** The wire width of an IPv6 address, in bytes. */
const IPV6_BYTE_LENGTH = 16;

/**
 * Reads an IPv4 or IPv6 address from a buffer, picking the version from its
 * length.
 *
 * `bytes` must be **exactly** 4 bytes (read as IPv4, returning `number`) or
 * **exactly** 16 (read as IPv6, returning `bigint`). Any other length throws a
 * `RangeError` rather than guessing.
 *
 * There is deliberately no `offset` parameter. An offset would make the width
 * depend on how much data happens to trail the field rather than on the
 * caller's intent — a 4-byte address 8 bytes from the end of a frame would
 * read as IPv4, and the same field in the same position would read as IPv6 the
 * day the frame grew. Pass the exact bytes instead, with
 * `packet.subarray(12, 16)`, which is a non-copying view; or, when the version
 * is already known, use {@link addressv4FromBytes} or {@link addressv6FromBytes}, which
 * do take an offset because their width comes from the function rather than
 * from the buffer.
 *
 * Unlike {@link parseAddress}, this does **not** unwrap IPv4-mapped addresses.
 * Sixteen bytes always return a `bigint`, so that
 * `addressToBytes(addressFromBytes(b)).length === b.length`. Callers wanting the
 * dual-stack normalization compose {@link unmapToAddressv4} explicitly.
 *
 * @param bytes The buffer to read, which must be exactly 4 or 16 bytes long
 * @returns The address as `number` (IPv4) or `bigint` (IPv6)
 * @throws {RangeError} If `bytes` is neither 4 nor 16 bytes long
 *
 * @example The length picks the version
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressFromBytes } from "@hertzg/ip/bytes";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * assertEquals(stringifyAddress(addressFromBytes(new Uint8Array([10, 0, 0, 1]))), "10.0.0.1");
 * assertEquals(stringifyAddress(addressFromBytes(new Uint8Array(16))), "::");
 * ```
 *
 * @example Sixteen mapped bytes stay IPv6
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressFromBytes, addressToBytes } from "@hertzg/ip/bytes";
 * import { unmapToAddressv4 } from "@hertzg/ip/addressv6";
 * import { stringifyAddressv4 } from "@hertzg/ip/addressv4";
 *
 * // deno-fmt-ignore
 * const mapped = new Uint8Array([
 *   0, 0, 0, 0, 0, 0, 0, 0,
 *   0, 0, 0xff, 0xff, 192, 168, 1, 1,
 * ]);
 *
 * const address = addressFromBytes(mapped);
 * assertEquals(typeof address, "bigint");
 * assertEquals(addressToBytes(address).length, 16);
 *
 * // Normalizing to IPv4 is an explicit, separate step
 * assertEquals(stringifyAddressv4(unmapToAddressv4(address as bigint)), "192.168.1.1");
 * ```
 *
 * @example Any other length throws instead of guessing
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { addressFromBytes } from "@hertzg/ip/bytes";
 *
 * assertThrows(() => addressFromBytes(new Uint8Array(20)), RangeError);
 * assertThrows(() => addressFromBytes(new Uint8Array(6)), RangeError);
 * ```
 *
 * @example Reading a field out of a frame, by slicing rather than offsetting
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressFromBytes } from "@hertzg/ip/bytes";
 * import { addressv4FromBytes } from "@hertzg/ip/bytesv4";
 * import { stringifyAddress } from "@hertzg/ip/address";
 *
 * // deno-fmt-ignore
 * const packet = new Uint8Array([
 *   0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
 *   0x40, 0x06, 0x00, 0x00,
 *   10, 0, 0, 1,
 *   192, 168, 1, 1,
 * ]);
 *
 * // `subarray` is a view, not a copy, and it states the width
 * assertEquals(stringifyAddress(addressFromBytes(packet.subarray(12, 16))), "10.0.0.1");
 *
 * // When the version is known, the version-specific function takes the offset
 * assertEquals(addressv4FromBytes(packet, 12), addressFromBytes(packet.subarray(12, 16)));
 * ```
 */
export function addressFromBytes(bytes: Uint8Array): Address {
  if (
    bytes.length !== IPV4_BYTE_LENGTH && bytes.length !== IPV6_BYTE_LENGTH
  ) {
    throw new RangeError(
      `IP address must be exactly ${IPV4_BYTE_LENGTH} or ${IPV6_BYTE_LENGTH} bytes, got ${bytes.length}`,
    );
  }

  return bytes.length === IPV4_BYTE_LENGTH
    ? addressv4FromBytes(bytes)
    : addressv6FromBytes(bytes);
}

/**
 * Writes an IPv4 or IPv6 address, either into a fresh buffer or into one you
 * supply.
 *
 * The width comes from the type of `address` — 4 bytes for a `number`, 16 for
 * a `bigint` — the same `typeof` dispatch {@link stringifyAddress} uses. The
 * address is written in network order (big-endian), and the return value is
 * always exactly the bytes written, so `result.length` tells you the width.
 * When `into` is given the return is a **view** into it, never the whole of
 * it.
 *
 * @param address The address as a `number` (IPv4) or `bigint` (IPv6)
 * @param into The buffer to write into, whose size the caller owns; one of the
 *   address's wire width is allocated when omitted
 * @param offset Where in `into` to start writing, defaulting to `0`
 * @returns The bytes written — 4 for IPv4, 16 for IPv6
 * @throws {RangeError} If the address is out of range, or its width is not
 *   available at `offset`
 *
 * @example The address type picks the width
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressToBytes } from "@hertzg/ip/bytes";
 * import { parseAddress } from "@hertzg/ip/address";
 *
 * assertEquals(addressToBytes(parseAddress("10.0.0.1").address), new Uint8Array([10, 0, 0, 1]));
 * assertEquals(addressToBytes(parseAddress("::1").address).length, 16);
 * ```
 *
 * @example Round-tripping a packet field
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { addressFromBytes, addressToBytes } from "@hertzg/ip/bytes";
 *
 * const field = new Uint8Array([192, 168, 1, 1]);
 * assertEquals(addressToBytes(addressFromBytes(field)), field);
 * ```
 */
export function addressToBytes(
  address: Address,
  into?: Uint8Array,
  offset = 0,
): Uint8Array {
  return typeof address === "bigint"
    ? addressv6ToBytes(address, into, offset)
    : addressv4ToBytes(address, into, offset);
}
