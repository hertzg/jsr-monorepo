/**
 * Conversion between numeric IP addresses and their network-order wire bytes.
 *
 * This module reads addresses straight out of a packet buffer and writes them
 * straight back into one, with no string round-trip. It is the byte-form
 * counterpart of the `ipv4` and `ipv6` submodules: {@link ipv4FromBytes} is to
 * {@link parseIpv4} what {@link ipv4ToBytes} is to {@link stringifyIpv4}.
 *
 * Addresses keep the numeric representation of the rest of the package —
 * `number` for IPv4, `bigint` for IPv6. Bytes are a conversion, not a third
 * representation.
 *
 * ## Byte order
 *
 * Always network order (big-endian), on both the read and the write side.
 * There is no option, because an IP address has exactly one wire order.
 *
 * ## Widths and offsets
 *
 * Each version-specific function has a fixed width — 4 bytes for IPv4, 16 for
 * IPv6 — and `offset` selects where in the buffer that span sits, never how
 * wide it is. A span that runs past the end of the buffer throws a
 * `RangeError` rather than reading `undefined` and quietly decoding as
 * `0.0.0.0`.
 *
 * The universal {@link ipFromBytes} instead picks the version from the span
 * width, which must be exactly 4 or 16 bytes; anything else throws. Decoders
 * that know the version and the field offset want the version-specific
 * functions.
 *
 * @example Decode both addresses out of an IPv4 header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4FromBytes } from "@hertzg/ip/bytes";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * // deno-fmt-ignore
 * const packet = new Uint8Array([
 *   0x45, 0x00, 0x00, 0x54, 0x1c, 0x46, 0x40, 0x00,
 *   0x40, 0x06, 0x00, 0x00,
 *   10, 0, 0, 1,
 *   192, 168, 1, 1,
 * ]);
 *
 * assertEquals(stringifyIpv4(ipv4FromBytes(packet, 12)), "10.0.0.1");
 * assertEquals(stringifyIpv4(ipv4FromBytes(packet, 16)), "192.168.1.1");
 * ```
 *
 * @example Assemble an IPv4 header in place
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToBytes } from "@hertzg/ip/bytes";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const frame = new Uint8Array(20);
 * ipv4ToBytes(parseIpv4("10.0.0.1"), frame, 12);
 * ipv4ToBytes(parseIpv4("192.168.1.1"), frame, 16);
 *
 * assertEquals(frame.slice(12), new Uint8Array([10, 0, 0, 1, 192, 168, 1, 1]));
 * ```
 *
 * @module
 */

import type { Address } from "./ip.ts";

/** The wire width of an IPv4 address, in bytes. */
const IPV4_BYTE_LENGTH = 4;

/** The wire width of an IPv6 address, in bytes. */
const IPV6_BYTE_LENGTH = 16;

/**
 * Throws unless `[offset, offset + width)` lies inside a buffer of
 * `byteLength` bytes.
 *
 * @param byteLength The length of the buffer being indexed
 * @param offset The start of the span
 * @param width The width of the span
 * @param version The version label used in the error message
 */
function requireSpan(
  byteLength: number,
  offset: number,
  width: number,
  version: string,
): void {
  if (offset < 0 || offset + width > byteLength) {
    throw new RangeError(
      `${version} needs ${width} bytes at offset ${offset} of a ${byteLength}-byte buffer`,
    );
  }
}

/**
 * Resolves the `width`-byte span a write should land in: a fresh buffer when
 * `into` is omitted, otherwise a view into `into` at `offset`.
 *
 * The span is validated before it is returned, so a caller's buffer is never
 * partially written when the offset does not fit.
 *
 * @param into The caller's buffer, or `undefined` to allocate
 * @param offset The offset within `into` to write at
 * @param width The wire width of the address being written
 * @param version The version label used in the error message
 * @returns The span to write into, which aliases `into` when one was given
 */
function targetSpan(
  into: Uint8Array | undefined,
  offset: number,
  width: number,
  version: string,
): Uint8Array {
  if (into === undefined) {
    return new Uint8Array(width);
  }
  requireSpan(into.length, offset, width, version);
  return into.subarray(offset, offset + width);
}

/**
 * Reads four bytes in network order as a 32-bit unsigned integer. The caller
 * is responsible for the span being in bounds.
 *
 * @param bytes The buffer to read from
 * @param offset The offset of the first byte
 * @returns The 32-bit unsigned integer
 */
function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]) >>> 0;
}

/**
 * Writes a 32-bit unsigned integer as four bytes in network order. The caller
 * is responsible for the span being in bounds.
 *
 * @param value The 32-bit unsigned integer
 * @param into The buffer to write into
 * @param offset The offset of the first byte
 */
function writeUint32(value: number, into: Uint8Array, offset: number): void {
  into[offset] = value >>> 24;
  into[offset + 1] = (value >>> 16) & 0xFF;
  into[offset + 2] = (value >>> 8) & 0xFF;
  into[offset + 3] = value & 0xFF;
}

/**
 * Reads a 4-byte IPv4 address from a buffer.
 *
 * The four bytes at `offset` are read in network order (big-endian) and
 * combined into the 32-bit unsigned integer representation used throughout
 * this package.
 *
 * @param bytes The buffer to read from
 * @param offset The offset of the first of the four bytes, defaulting to `0`
 * @returns The address as a 32-bit unsigned integer
 * @throws {RangeError} If four bytes are not available at `offset`
 *
 * @example Read an address out of a packet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4FromBytes } from "@hertzg/ip/bytes";
 * import { stringifyIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4FromBytes(new Uint8Array([10, 0, 0, 1])), 167772161);
 * assertEquals(
 *   stringifyIpv4(ipv4FromBytes(new Uint8Array([0xaa, 0xaa, 192, 168, 1, 1]), 2)),
 *   "192.168.1.1",
 * );
 * ```
 *
 * @example The high bit does not produce a negative number
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4FromBytes } from "@hertzg/ip/bytes";
 *
 * assertEquals(ipv4FromBytes(new Uint8Array([255, 255, 255, 255])), 4294967295);
 * ```
 *
 * @example A span that runs off the end throws
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { ipv4FromBytes } from "@hertzg/ip/bytes";
 *
 * assertThrows(() => ipv4FromBytes(new Uint8Array([1, 2, 3])), RangeError);
 * assertThrows(() => ipv4FromBytes(new Uint8Array([1, 2, 3, 4]), 1), RangeError);
 * ```
 */
export function ipv4FromBytes(bytes: Uint8Array, offset = 0): number {
  requireSpan(bytes.length, offset, IPV4_BYTE_LENGTH, "IPv4");
  return readUint32(bytes, offset);
}

/** Writes an IPv4 address into a freshly allocated 4-byte buffer. */
export function ipv4ToBytes(address: number): Uint8Array;
/** Writes an IPv4 address into an existing buffer at `offset`. */
export function ipv4ToBytes(
  address: number,
  into: Uint8Array,
  offset?: number,
): Uint8Array;
/**
 * Writes a 4-byte IPv4 address, either into a fresh buffer or into one you
 * supply.
 *
 * The address is written in network order (big-endian). The return value is
 * always exactly the four bytes written: a fresh `Uint8Array` when `into` is
 * omitted, and a **view** into `into` when it is given — never the whole of
 * `into`. Writing through that view writes into `into`.
 *
 * @param address The address as a 32-bit unsigned integer
 * @param into The buffer to write into; a 4-byte buffer is allocated when omitted
 * @param offset The offset within `into` to write at, defaulting to `0`
 * @returns The four bytes written
 * @throws {RangeError} If the address is out of range, or four bytes are not
 *   available at `offset`
 *
 * @example Allocate
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToBytes } from "@hertzg/ip/bytes";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4ToBytes(parseIpv4("10.0.0.1")), new Uint8Array([10, 0, 0, 1]));
 * ```
 *
 * @example Write into an existing frame, and get back only what was written
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToBytes } from "@hertzg/ip/bytes";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * const frame = new Uint8Array(20).fill(0xaa);
 * const written = ipv4ToBytes(parseIpv4("192.168.1.1"), frame, 6);
 *
 * assertEquals(written, new Uint8Array([192, 168, 1, 1]));
 * assertEquals(frame.slice(4, 12), new Uint8Array([0xaa, 0xaa, 192, 168, 1, 1, 0xaa, 0xaa]));
 * ```
 *
 * @example The returned view aliases the buffer it was written into
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToBytes } from "@hertzg/ip/bytes";
 *
 * const frame = new Uint8Array(8);
 * const written = ipv4ToBytes(167772161, frame, 4);
 * written[3] = 9;
 *
 * assertEquals(frame[7], 9);
 * ```
 */
export function ipv4ToBytes(
  address: number,
  into?: Uint8Array,
  offset = 0,
): Uint8Array {
  if (address < 0 || address > 4294967295 || !Number.isInteger(address)) {
    throw new RangeError(
      `IPv4 value out of range: ${address} (must be 0 to 4294967295)`,
    );
  }

  const span = targetSpan(into, offset, IPV4_BYTE_LENGTH, "IPv4");
  writeUint32(address, span, 0);
  return span;
}

/**
 * Reads a 16-byte IPv6 address from a buffer.
 *
 * The sixteen bytes at `offset` are read in network order (big-endian) and
 * combined into the 128-bit `bigint` representation used throughout this
 * package. IPv4-mapped byte sequences (`::ffff:x.x.x.x`) are returned as the
 * full 128-bit value, not unwrapped to a `number`.
 *
 * @param bytes The buffer to read from
 * @param offset The offset of the first of the sixteen bytes, defaulting to `0`
 * @returns The address as a 128-bit unsigned bigint
 * @throws {RangeError} If sixteen bytes are not available at `offset`
 *
 * @example Read an address out of a packet
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6FromBytes } from "@hertzg/ip/bytes";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * // deno-fmt-ignore
 * const bytes = new Uint8Array([
 *   0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
 * ]);
 *
 * assertEquals(stringifyIpv6(ipv6FromBytes(bytes)), "2001:db8::1");
 * ```
 *
 * @example IPv4-mapped bytes stay a 128-bit value
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6FromBytes } from "@hertzg/ip/bytes";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * // deno-fmt-ignore
 * const bytes = new Uint8Array([
 *   0, 0, 0, 0, 0, 0, 0, 0,
 *   0, 0, 0xff, 0xff, 192, 168, 1, 1,
 * ]);
 *
 * assertEquals(stringifyIpv6(ipv6FromBytes(bytes)), "::ffff:c0a8:101");
 * ```
 *
 * @example A span that runs off the end throws
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { ipv6FromBytes } from "@hertzg/ip/bytes";
 *
 * assertThrows(() => ipv6FromBytes(new Uint8Array(15)), RangeError);
 * assertThrows(() => ipv6FromBytes(new Uint8Array(16), 1), RangeError);
 * ```
 */
export function ipv6FromBytes(bytes: Uint8Array, offset = 0): bigint {
  requireSpan(bytes.length, offset, IPV6_BYTE_LENGTH, "IPv6");
  return (BigInt(readUint32(bytes, offset)) << 96n) |
    (BigInt(readUint32(bytes, offset + 4)) << 64n) |
    (BigInt(readUint32(bytes, offset + 8)) << 32n) |
    BigInt(readUint32(bytes, offset + 12));
}

/** Writes an IPv6 address into a freshly allocated 16-byte buffer. */
export function ipv6ToBytes(address: bigint): Uint8Array;
/** Writes an IPv6 address into an existing buffer at `offset`. */
export function ipv6ToBytes(
  address: bigint,
  into: Uint8Array,
  offset?: number,
): Uint8Array;
/**
 * Writes a 16-byte IPv6 address, either into a fresh buffer or into one you
 * supply.
 *
 * The address is written in network order (big-endian). The return value is
 * always exactly the sixteen bytes written: a fresh `Uint8Array` when `into`
 * is omitted, and a **view** into `into` when it is given — never the whole of
 * `into`. Writing through that view writes into `into`.
 *
 * @param address The address as a 128-bit unsigned bigint
 * @param into The buffer to write into; a 16-byte buffer is allocated when omitted
 * @param offset The offset within `into` to write at, defaulting to `0`
 * @returns The sixteen bytes written
 * @throws {RangeError} If the address is out of range, or sixteen bytes are
 *   not available at `offset`
 *
 * @example Allocate
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6ToBytes } from "@hertzg/ip/bytes";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * // deno-fmt-ignore
 * assertEquals(ipv6ToBytes(parseIpv6("2001:db8::1")), new Uint8Array([
 *   0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
 * ]));
 * ```
 *
 * @example Write into an existing frame
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6ToBytes } from "@hertzg/ip/bytes";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const frame = new Uint8Array(40);
 * const written = ipv6ToBytes(parseIpv6("::1"), frame, 8);
 *
 * assertEquals(written.length, 16);
 * assertEquals(frame[23], 1);
 * ```
 */
export function ipv6ToBytes(
  address: bigint,
  into?: Uint8Array,
  offset = 0,
): Uint8Array {
  if (address < 0n || address > 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFn) {
    throw new RangeError(
      `IPv6 value out of range: ${address} (must be 0 to 2^128-1)`,
    );
  }

  const span = targetSpan(into, offset, IPV6_BYTE_LENGTH, "IPv6");
  writeIpv6(address, span);
  return span;
}

/**
 * Writes a 128-bit address as sixteen bytes in network order, as four 32-bit
 * groups. The caller is responsible for `into` being exactly the span.
 *
 * @param address The address as a 128-bit unsigned bigint
 * @param into The 16-byte span to write into
 */
function writeIpv6(address: bigint, into: Uint8Array): void {
  writeUint32(Number(BigInt.asUintN(32, address >> 96n)), into, 0);
  writeUint32(Number(BigInt.asUintN(32, address >> 64n)), into, 4);
  writeUint32(Number(BigInt.asUintN(32, address >> 32n)), into, 8);
  writeUint32(Number(BigInt.asUintN(32, address)), into, 12);
}

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
