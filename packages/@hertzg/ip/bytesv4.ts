/**
 * Conversion between IPv4 addresses and their network-order wire bytes.
 *
 * This module reads an address straight out of a packet buffer and writes it
 * straight back into one, with no string round-trip. It is the byte-form
 * counterpart of the `ipv4` submodule: {@link ipv4FromBytes} is to
 * {@link parseIpv4} what {@link ipv4ToBytes} is to {@link stringifyIpv4}.
 *
 * Addresses keep the numeric representation of the rest of the package — a
 * `number` holding a 32-bit unsigned integer. Bytes are a conversion, not a
 * second representation.
 *
 * ## Byte order
 *
 * Always network order (big-endian), on both the read and the write side.
 * There is no option, because an IP address has exactly one wire order.
 *
 * ## Widths and offsets
 *
 * Both functions are fixed at 4 bytes, and `offset` selects where in the
 * buffer that span sits, never how wide it is. A span that runs past the end
 * of the buffer throws a `RangeError` rather than reading `undefined` and
 * quietly decoding as `0.0.0.0`.
 *
 * For IPv6 see [`bytesv6`](https://jsr.io/@hertzg/ip/doc/bytesv6); for the
 * version-detecting pair see [`bytes`](https://jsr.io/@hertzg/ip/doc/bytes).
 *
 * @example Decode both addresses out of an IPv4 header
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4FromBytes } from "@hertzg/ip/bytesv4";
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
 * import { ipv4ToBytes } from "@hertzg/ip/bytesv4";
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

/** The wire width of an IPv4 address, in bytes. */
const IPV4_BYTE_LENGTH = 4;

/** The largest value an IPv4 address can hold, as a 32-bit unsigned integer. */
const IPV4_MAX = 4294967295;

/**
 * Writes an address as four bytes in network order. The caller is responsible
 * for the span being in bounds.
 *
 * Index arithmetic rather than a `DataView`: the view would have to be built
 * per call, since the buffer differs per call, and that constructor is the
 * whole cost. See ADR 0012.
 *
 * @param address The address as a 32-bit unsigned integer
 * @param into The buffer to write into
 * @param offset The offset of the first byte
 */
function writeBytes(address: number, into: Uint8Array, offset: number): void {
  into[offset] = address >>> 24;
  into[offset + 1] = (address >>> 16) & 0xFF;
  into[offset + 2] = (address >>> 8) & 0xFF;
  into[offset + 3] = address & 0xFF;
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
 * import { ipv4FromBytes } from "@hertzg/ip/bytesv4";
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
 * import { ipv4FromBytes } from "@hertzg/ip/bytesv4";
 *
 * assertEquals(ipv4FromBytes(new Uint8Array([255, 255, 255, 255])), 4294967295);
 * ```
 *
 * @example A span that runs off the end throws
 * ```ts
 * import { assertThrows } from "@std/assert";
 * import { ipv4FromBytes } from "@hertzg/ip/bytesv4";
 *
 * assertThrows(() => ipv4FromBytes(new Uint8Array([1, 2, 3])), RangeError);
 * assertThrows(() => ipv4FromBytes(new Uint8Array([1, 2, 3, 4]), 1), RangeError);
 * ```
 */
export function ipv4FromBytes(bytes: Uint8Array, offset = 0): number {
  if (offset < 0 || offset + IPV4_BYTE_LENGTH > bytes.length) {
    throw new RangeError(
      `IPv4 needs ${IPV4_BYTE_LENGTH} bytes at offset ${offset} of a ${bytes.length}-byte buffer`,
    );
  }
  return ((bytes[offset] << 24) |
    (bytes[offset + 1] << 16) |
    (bytes[offset + 2] << 8) |
    bytes[offset + 3]) >>> 0;
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
 * import { ipv4ToBytes } from "@hertzg/ip/bytesv4";
 * import { parseIpv4 } from "@hertzg/ip/ipv4";
 *
 * assertEquals(ipv4ToBytes(parseIpv4("10.0.0.1")), new Uint8Array([10, 0, 0, 1]));
 * ```
 *
 * @example Write into an existing frame, and get back only what was written
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ipv4ToBytes } from "@hertzg/ip/bytesv4";
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
 * import { ipv4ToBytes } from "@hertzg/ip/bytesv4";
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
  if (address < 0 || address > IPV4_MAX || !Number.isInteger(address)) {
    throw new RangeError(
      `IPv4 value out of range: ${address} (must be 0 to ${IPV4_MAX})`,
    );
  }

  if (into === undefined) {
    const bytes = new Uint8Array(IPV4_BYTE_LENGTH);
    writeBytes(address, bytes, 0);
    return bytes;
  }

  if (offset < 0 || offset + IPV4_BYTE_LENGTH > into.length) {
    throw new RangeError(
      `IPv4 needs ${IPV4_BYTE_LENGTH} bytes at offset ${offset} of a ${into.length}-byte buffer`,
    );
  }
  writeBytes(address, into, offset);
  return into.subarray(offset, offset + IPV4_BYTE_LENGTH);
}
