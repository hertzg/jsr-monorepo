/**
 * This module builds on top of the {@link BinarySeeker} class to provide methods for reading various binary data types
 * with a seekable cursor.
 *
 * The methods are named according to the data type and endianness, when endianness is not specified, big-endian is assumed.
 *
 * Signature: `<type><bits>[endianness](): number | bigint`
 * Types: `b` - bit, `u` - unsigned int, `s` - signed int, `f` - floating-point
 * Bits: `8`, `16`, `32`, `64`
 * Endianness: `be` - big-endian, `le` - little-endian (default is big-endian)
 *
 * Under the hood, the methods use {@link DataView} to read the binary data from the buffer.
 * {@link b8} method reads a full byte and returns an array of 8 bits (0 or 1).
 * All 8, 16, 32 -bit methods return a {@link number} (integer or floating-point).
 * All 64-bit floating-point methods return a {@link number}.
 * All 64-bit integer methods return a {@link bigint}.
 *
 * @example
 * ```ts
 * import BinaryReader from "@hertzg/binseek/reader";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([
 *   0b00111100, // b8
 *
 *   0x00, // u8
 *   0x00, // s8
 *
 *   0x01, 0x02, // u16be
 *   0x01, 0x02, // u16le
 *   0x01, 0x02, // s16be
 *   0x01, 0x02, // s16le
 *   0x01, 0x02, // f16be
 *   0x01, 0x02, // f16le
 *
 *   0x03, 0x04, 0x05, 0x06, // u32be
 *   0x03, 0x04, 0x05, 0x06, // u32le
 *   0x03, 0x04, 0x05, 0x06, // s32be
 *   0x03, 0x04, 0x05, 0x06, // s32le
 *   0x03, 0x04, 0x05, 0x06, // f32be
 *   0x03, 0x04, 0x05, 0x06, // f32le
 *
 *   0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // u64be
 *   0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // u64le
 *   0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // s64be
 *   0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // s64le
 *   0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // f64be
 *   0x07, 0x08, 0x09, 0x0A, 0x0B, 0x0C, 0x0D, 0x0E, // f64le
 *
 *   0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, // bytes
 * ]);
 *
 * const reader = new BinaryReader(buffer);
 * assertEquals(reader.cursor, 0);
 *
 * assertEquals(reader.b8(), [0, 0, 1, 1, 1, 1, 0, 0]);
 * assertEquals(reader.cursor, 1);
 *
 * assertEquals(reader.u8(), 0x00);
 * assertEquals(reader.cursor, 2);
 *
 * assertEquals(reader.s8(), 0x00);
 * assertEquals(reader.cursor, 3);
 *
 * assertEquals(reader.u16be(), 0x0102);
 * assertEquals(reader.cursor, 5);
 *
 * assertEquals(reader.u16le(), 0x0201);
 * assertEquals(reader.cursor, 7);
 *
 * assertEquals(reader.s16be(), 0x0102);
 * assertEquals(reader.cursor, 9);
 *
 * assertEquals(reader.s16le(), 0x0201);
 * assertEquals(reader.cursor, 11);
 *
 * assertEquals(reader.f16be(), 0.00001537799835205078);
 * assertEquals(reader.cursor, 13);
 *
 * assertEquals(reader.f16le(), 0.00003057718276977539);
 * assertEquals(reader.cursor, 15);
 *
 * assertEquals(reader.u32be(), 0x03040506);
 * assertEquals(reader.cursor, 19);
 *
 * assertEquals(reader.u32le(), 0x06050403);
 * assertEquals(reader.cursor, 23);
 *
 * assertEquals(reader.s32be(), 0x03040506);
 * assertEquals(reader.cursor, 27);
 *
 * assertEquals(reader.s32le(), 0x06050403);
 * assertEquals(reader.cursor, 31);
 *
 * assertEquals(reader.f32be(), 3.879708020057588e-37);
 * assertEquals(reader.cursor, 35);
 *
 * assertEquals(reader.f32le(), 2.50174671309531e-35);
 * assertEquals(reader.cursor, 39);
 *
 * assertEquals(reader.u64be(), 0x0708090A0B0C0D0En);
 * assertEquals(reader.cursor, 47);
 *
 * assertEquals(reader.u64le(), 0x0E0D0C0B0A090807n);
 * assertEquals(reader.cursor, 55);
 *
 * assertEquals(reader.s64be(), 0x0708090A0B0C0D0En);
 * assertEquals(reader.cursor, 63);
 *
 * assertEquals(reader.s64le(), 0x0E0D0C0B0A090807n);
 * assertEquals(reader.cursor, 71);
 *
 * assertEquals(reader.f64be(), 8.677681104995428e-275);
 * assertEquals(reader.cursor, 79);
 *
 * assertEquals(reader.f64le(), 5.4452198134122365e-241);
 * assertEquals(reader.cursor, 87);
 *
 * // Inherited from BinarySeeker, just for demonstration
 * assertEquals(reader.bytes(8), new Uint8Array([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]));
 * assertEquals(reader.cursor, 95);
 * ```
 *
 * @module reader
 */

import BinarySeeker from "@hertzg/binseek/seeker";

/**
 * Retrieves the bit value at a specific index from a given byte.
 *
 * @example
 * ```ts
 * import { byteGetBit } from "@hertzg/binseek/reader";
 * import { assertEquals } from "@std/assert";
 *
 * const byte = 0b10000001;
 *
 * assertEquals(byteGetBit(byte, 0), 1);
 * assertEquals(byteGetBit(byte, 1), 0);
 * assertEquals(byteGetBit(byte, 2), 0);
 * assertEquals(byteGetBit(byte, 3), 0);
 * assertEquals(byteGetBit(byte, 4), 0);
 * assertEquals(byteGetBit(byte, 5), 0);
 * assertEquals(byteGetBit(byte, 6), 0);
 * assertEquals(byteGetBit(byte, 7), 1);
 * ```
 *
 * @param {number} byte - The byte from which to extract the bit.
 * @param {number} index - The bit position (0 for least significant bit, up to 7).
 * @returns {number} The bit value (0 or 1) at the specified index.
 */
export function byteGetBit(byte: number, index: number): number {
  return (byte & (1 << index)) >> index;
}

/**
 * BinaryReader for reading binary data with a seekable cursor.
 *
 * The reader uses a {@link BinarySeeker} to navigate the buffer and read data.
 * The reader methods return the value of the read data and advance the cursor by the specified length.
 * Some methods like {@link skip} and {@link reset} return the instance of the reader to allow chaining.
 * The reader methods never copy the data, always read directly from the buffer.
 *
 * See {@link module} for more information.
 */
export default class BinaryReader {
  #seeker: BinarySeeker;

  /**
   * Creates an instance of BinaryReader.
   *
   * @param {Uint8Array} buffer - The buffer to read from.
   */
  constructor(buffer: Uint8Array) {
    this.#seeker = new BinarySeeker(buffer);
  }

  /**
   * Gets the current cursor position within the buffer relative to the buffer offset.
   */
  get cursor(): number {
    return this.#seeker.cursor;
  }

  /**
   * Returns the number of bytes left in read buffer.
   */
  get bytesLeft(): number {
    return this.#seeker.bytesLeft;
  }

  /**
   * Resets the cursor position to the beginning of the buffer.
   *
   * @returns {this} The instance of the reader.
   */
  reset(): this {
    this.#seeker.reset();
    return this;
  }

  /**
   * Advances the cursor by the specified number of bytes.
   *
   * @param {number} offset - The number of bytes to skip.
   * @returns {this} The instance of the reader.
   */
  skip(offset: number): this {
    this.#seeker.skip(offset);

    return this;
  }

  /**
   * Reads a specified number of bytes from the current position and advances the cursor by the specified length.
   * If the length is not provided, reads the buffer until the end.
   *
   * Does not copy the data, always returns a view into the buffer.
   *
   * @param {number} [length=this.bytesLeft] - The number of bytes to read. Defaults to the remaining bytes in the buffer.
   * @returns {Uint8Array} A new Uint8Array view into the buffer.
   */
  bytes(length: number = this.bytesLeft): Uint8Array {
    return this.#seeker.bytes(length);
  }

  /**
   * Reads 8 bits from the current position as an array of bits.
   * @returns {number[]} An array of 8 numbers (0 or 1) representing the bits of the read byte.
   */
  b8(): number[] {
    const byte = this.u8();
    return Array.from({ length: 8 }, (_, index) => byteGetBit(byte, index));
  }

  /**
   * Reads an unsigned 8-bit integer from the current position and advances the cursor by 1.
   * @returns A number representing the unsigned 8-bit integer.
   */
  u8(): number {
    return this.#seeker.view(1).getUint8(0);
  }

  /**
   * Reads a signed 8-bit integer from the current position and advances the cursor by 1.
   * @returns A number representing the signed 8-bit integer.
   */
  s8(): number {
    return this.#seeker.view(1).getInt8(0);
  }

  /**
   * Reads an unsigned 16-bit integer.
   * Alias for {@link u16be}.
   * @returns A number representing the unsigned 16-bit integer in big-endian.
   */
  u16(): number {
    return this.u16be();
  }

  /**
   * Reads an unsigned 16-bit integer in big-endian format from the current position and advances the cursor by 2.
   * @returns A number representing the unsigned 16-bit integer in big-endian.
   */
  u16be(): number {
    return this.#seeker.view(2).getUint16(0);
  }

  /**
   * Reads an unsigned 16-bit integer in little-endian format from the current position and advances the cursor by 2.
   * @returns A number representing the unsigned 16-bit integer in little-endian.
   */
  u16le(): number {
    return this.#seeker.view(2).getUint16(0, true);
  }

  /**
   * Reads a signed 16-bit integer.
   * Alias for {@link s16be}.
   * @returns A number representing the signed 16-bit integer in big-endian.
   */
  s16(): number {
    return this.s16be();
  }

  /**
   * Reads a signed 16-bit integer in big-endian format from the current position and advances the cursor by 2.
   * @returns A number representing the signed 16-bit integer in big-endian.
   */
  s16be(): number {
    return this.#seeker.view(2).getInt16(0);
  }

  /**
   * Reads a signed 16-bit integer in little-endian format from the current position and advances the cursor by 2.
   * @returns A number representing the signed 16-bit integer in little-endian.
   */
  s16le(): number {
    return this.#seeker.view(2).getInt16(0, true);
  }

  /**
   * Reads a 16-bit floating-point number.
   * Alias for {@link f16be}.
   * @returns A number representing the 16-bit floating-point number in big-endian.
   */
  f16(): number {
    return this.f16be();
  }

  /**
   * Reads a 16-bit floating-point number in big-endian format from the current position and advances the cursor by 2.
   */
  f16be(): number {
    return this.#seeker.view(2).getFloat16(0);
  }

  /**
   * Reads a 16-bit floating-point number in little-endian format from the current position and advances the cursor by 2.
   */
  f16le(): number {
    return this.#seeker.view(2).getFloat16(0, true);
  }

  /**
   * Reads an unsigned 32-bit integer.
   * Alias for {@link u32be}.
   * @returns A number representing the unsigned 32-bit integer in big-endian.
   */
  u32(): number {
    return this.u32be();
  }

  /**
   * Reads an unsigned 32-bit integer in big-endian format from the current position and advances the cursor by 4.
   * @returns A number representing the unsigned 32-bit integer in big-endian.
   */
  u32be(): number {
    return this.#seeker.view(4).getUint32(0);
  }

  /**
   * Reads an unsigned 32-bit integer in little-endian format from the current position and advances the cursor by 4.
   * @returns A number representing the unsigned 32-bit integer in little-endian.
   */
  u32le(): number {
    return this.#seeker.view(4).getUint32(0, true);
  }

  /**
   * Reads a signed 32-bit integer.
   * Alias for {@link s32be}.
   * @returns A number representing the signed 32-bit integer in big-endian.
   */
  s32(): number {
    return this.s32be();
  }

  /**
   * Reads a signed 32-bit integer in big-endian format from the current position and advances the cursor by 4.
   * @returns A number representing the signed 32-bit integer in big-endian.
   */
  s32be(): number {
    return this.#seeker.view(4).getInt32(0);
  }

  /**
   * Reads a signed 32-bit integer in little-endian format from the current position and advances the cursor by 4.
   * @returns A number representing the signed 32-bit integer in little-endian.
   */
  s32le(): number {
    return this.#seeker.view(4).getInt32(0, true);
  }

  /**
   * Reads a 32-bit floating-point number.
   * Alias for {@link f32be}.
   * @returns A number representing the 32-bit floating-point number in big-endian.
   */
  f32(): number {
    return this.f32be();
  }

  /**
   * Reads a 32-bit floating-point number in big-endian format from the current position and advances the cursor by 4.
   */
  f32be(): number {
    return this.#seeker.view(4).getFloat32(0);
  }

  /**
   * Reads a 32-bit floating-point number in little-endian format from the current position and advances the cursor by 4.
   */
  f32le(): number {
    return this.#seeker.view(4).getFloat32(0, true);
  }

  /**
   * Reads an unsigned 64-bit integer.
   * Alias for {@link u64be}.
   * @returns A number representing the unsigned 64-bit integer in big-endian.
   */
  u64(): bigint {
    return this.u64be();
  }

  /**
   * Reads an unsigned 64-bit integer in big-endian format from the current position and advances the cursor by 8.
   * @returns A number representing the unsigned 64-bit integer in big-endian.
   */
  u64be(): bigint {
    return this.#seeker.view(8).getBigUint64(0);
  }

  /**
   * Reads an unsigned 64-bit integer in little-endian format from the current position and advances the cursor by 8.
   * @returns A number representing the unsigned 64-bit integer in little-endian.
   */
  u64le(): bigint {
    return this.#seeker.view(8).getBigUint64(0, true);
  }

  /**
   * Reads a signed 64-bit integer.
   * Alias for {@link s64be}.
   * @returns A number representing the signed 64-bit integer in big-endian.
   */
  s64(): bigint {
    return this.s64be();
  }

  /**
   * Reads a signed 64-bit integer in big-endian format from the current position and advances the cursor by 8.
   * @returns A number representing the signed 64-bit integer in big-endian.
   */
  s64be(): bigint {
    return this.#seeker.view(8).getBigInt64(0);
  }

  /**
   * Reads a signed 64-bit integer in little-endian format from the current position and advances the cursor by 8.
   * @returns A number representing the signed 64-bit integer in little-endian.
   */
  s64le(): bigint {
    return this.#seeker.view(8).getBigInt64(0, true);
  }

  /**
   * Reads a 64-bit floating-point number.
   * Alias for {@link f64be}.
   * @returns A number representing the 64-bit floating-point number in big-endian.
   */
  f64(): number {
    return this.f64be();
  }

  /**
   * Reads a 64-bit floating-point number in big-endian format from the current position and advances the cursor by 8.
   * @returns A number representing the 64-bit floating-point number in big-endian.
   */
  f64be(): number {
    return this.#seeker.view(8).getFloat64(0);
  }

  /**
   * Reads a 64-bit floating-point number in little-endian format from the current position and advances the cursor by 8.
   * @returns A number representing the 64-bit floating-point number in little-endian.
   */
  f64le(): number {
    return this.#seeker.view(8).getFloat64(0, true);
  }
}
