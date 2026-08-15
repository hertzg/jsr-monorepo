/**
 * Conversion between IPv6 addresses and their network-order wire bytes.
 *
 * This module reads an address straight out of a packet buffer and writes it
 * straight back into one, with no string round-trip. It is the byte-form
 * counterpart of the `ipv6` submodule: {@link ipv6FromBytes} is to
 * {@link parseIpv6} what {@link ipv6ToBytes} is to {@link stringifyIpv6}.
 *
 * Addresses keep the numeric representation of the rest of the package — a
 * `bigint` holding a 128-bit unsigned integer. Bytes are a conversion, not a
 * second representation.
 *
 * ## Byte order
 *
 * Always network order (big-endian), on both the read and the write side.
 * There is no option, because an IP address has exactly one wire order.
 *
 * ## Widths and offsets
 *
 * Both functions are fixed at 16 bytes, and `offset` selects where in the
 * buffer that span sits, never how wide it is. A span that runs past the end
 * of the buffer throws a `RangeError` rather than reading `undefined` and
 * quietly decoding as `::`.
 *
 * IPv4-mapped byte sequences (`::ffff:x.x.x.x`) stay 128-bit values here; they
 * are never unwrapped to a `number`.
 *
 * For IPv4 see [`bytesv4`](https://jsr.io/@hertzg/ip/doc/bytesv4); for the
 * version-detecting pair see [`bytes`](https://jsr.io/@hertzg/ip/doc/bytes).
 *
 * @example Decode an address out of an IPv6 header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6FromBytes } from "@hertzg/ip/bytesv6";
 * import { stringifyIpv6 } from "@hertzg/ip/ipv6";
 *
 * // deno-fmt-ignore
 * const packet = new Uint8Array([
 *   0x60, 0x00, 0x00, 0x00, 0x00, 0x14, 0x06, 0x40,
 *   0x20, 0x01, 0x0d, 0xb8, 0x00, 0x00, 0x00, 0x00,
 *   0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01,
 * ]);
 *
 * assertEquals(stringifyIpv6(ipv6FromBytes(packet, 8)), "2001:db8::1");
 * ```
 *
 * @example Assemble an IPv6 header in place
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv6FromBytes, ipv6ToBytes } from "@hertzg/ip/bytesv6";
 * import { parseIpv6 } from "@hertzg/ip/ipv6";
 *
 * const frame = new Uint8Array(40);
 * ipv6ToBytes(parseIpv6("2001:db8::1"), frame, 8);
 * ipv6ToBytes(parseIpv6("2001:db8::2"), frame, 24);
 *
 * assertEquals(ipv6FromBytes(frame, 24), parseIpv6("2001:db8::2"));
 * ```
 *
 * @module
 */

/** The wire width of an IPv6 address, in bytes. */
const IPV6_BYTE_LENGTH = 16;

/** The largest value an IPv6 address can hold, as a 128-bit unsigned bigint. */
const IPV6_MAX = 0xFFFF_FFFF_FFFF_FFFF_FFFF_FFFF_FFFF_FFFFn;

// Bytes reach a `bigint` through 32-bit chunks because that is the widest a
// plain `number` can carry — JS bitwise operators coerce to 32-bit integers.
//
// Three shapes here look like tidy-ups and are all slower; ADR 0012 has the
// measurements, so take them from there rather than re-deriving them.
//
//   - Keep the two 64-bit halves in `ipv6FromBytes` inline. Extracting them
//     into a `readUint64` is slower, because a `bigint` crossing a function
//     boundary has to be materialized on the heap. That is also why the
//     helpers below are 32-bit while the algorithm works in halves — they
//     return a `number`, which is free to pass.
//   - Do not fold the read into one 128-bit accumulator. What costs is bigint
//     operand width, so joining two 64-bit halves last is cheaper.
//   - Do not mirror the halves into the write. It starts from one 128-bit
//     value, so splitting it first only adds allocations.

/**
 * Reads a 32-bit chunk in network order. The caller is responsible for the
 * span being in bounds.
 *
 * @param bytes The buffer to read from
 * @param offset The offset of the first byte of the chunk
 * @returns The chunk as a 32-bit unsigned integer
 */
function readUint32(bytes: Uint8Array, offset: number): number {
  return ((bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]) >>> 0;
}

/**
 * Writes a 32-bit chunk in network order. The caller is responsible for the
 * span being in bounds.
 *
 * @param value The 32-bit unsigned integer
 * @param into The buffer to write into
 * @param offset The offset of the first byte of the chunk
 */
function writeUint32(value: number, into: Uint8Array, offset: number): void {
  into[offset] = value >>> 24;
  into[offset + 1] = (value >>> 16) & 0xFF;
  into[offset + 2] = (value >>> 8) & 0xFF;
  into[offset + 3] = value & 0xFF;
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
 * import { ipv6FromBytes } from "@hertzg/ip/bytesv6";
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
 * import { ipv6FromBytes } from "@hertzg/ip/bytesv6";
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
 * import { ipv6FromBytes } from "@hertzg/ip/bytesv6";
 *
 * assertThrows(() => ipv6FromBytes(new Uint8Array(15)), RangeError);
 * assertThrows(() => ipv6FromBytes(new Uint8Array(16), 1), RangeError);
 * ```
 */
export function ipv6FromBytes(bytes: Uint8Array, offset = 0): bigint {
  if (offset < 0 || offset + IPV6_BYTE_LENGTH > bytes.length) {
    throw new RangeError(
      `IPv6 needs ${IPV6_BYTE_LENGTH} bytes at offset ${offset} of a ${bytes.length}-byte buffer`,
    );
  }
  const high = (BigInt(readUint32(bytes, offset)) << 32n) |
    BigInt(readUint32(bytes, offset + 4));
  const low = (BigInt(readUint32(bytes, offset + 8)) << 32n) |
    BigInt(readUint32(bytes, offset + 12));
  return (high << 64n) | low;
}

/**
 * Writes a 16-byte IPv6 address, either into a fresh buffer or into one you
 * supply.
 *
 * The address is written in network order (big-endian) as four 32-bit chunks.
 * The return value is always exactly the sixteen bytes written: a fresh
 * `Uint8Array` when `into` is omitted, and a **view** into `into` when it is
 * given — never the whole of `into`. Writing through that view writes into
 * `into`.
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
 * import { ipv6ToBytes } from "@hertzg/ip/bytesv6";
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
 * import { ipv6ToBytes } from "@hertzg/ip/bytesv6";
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
  if (address < 0n || address > IPV6_MAX) {
    throw new RangeError(
      `IPv6 value out of range: ${address} (must be 0 to 2^128-1)`,
    );
  }

  if (into === undefined) {
    const bytes = new Uint8Array(IPV6_BYTE_LENGTH);
    writeUint32(Number(BigInt.asUintN(32, address >> 96n)), bytes, 0);
    writeUint32(Number(BigInt.asUintN(32, address >> 64n)), bytes, 4);
    writeUint32(Number(BigInt.asUintN(32, address >> 32n)), bytes, 8);
    writeUint32(Number(BigInt.asUintN(32, address)), bytes, 12);
    return bytes;
  }

  if (offset < 0 || offset + IPV6_BYTE_LENGTH > into.length) {
    throw new RangeError(
      `IPv6 needs ${IPV6_BYTE_LENGTH} bytes at offset ${offset} of a ${into.length}-byte buffer`,
    );
  }
  writeUint32(Number(BigInt.asUintN(32, address >> 96n)), into, offset);
  writeUint32(Number(BigInt.asUintN(32, address >> 64n)), into, offset + 4);
  writeUint32(Number(BigInt.asUintN(32, address >> 32n)), into, offset + 8);
  writeUint32(Number(BigInt.asUintN(32, address)), into, offset + 12);
  return into.subarray(offset, offset + IPV6_BYTE_LENGTH);
}
