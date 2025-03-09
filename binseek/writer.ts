/**
 * @module writer
 * This module builds on top of the {@link BinarySeeker} class to provide methods for writing various binary data types
 * with a seekable cursor. Each method returns the instance of the writer to allow chaining.
 *
 * The methods are named according to the data type and endianness, when endianness is not specified, big-endian is
 * assumed.
 *
 * Signature: `<type><bits>[endianness](value: number | bigint): this`
 * Types: `b` - bit, `u` - unsigned int, `s` - signed int, `f` - floating-point
 * Bits: `8`, `16`, `32`, `64`
 * Endianness: `be` - big-endian, `le` - little-endian (default is big-endian)
 *
 * Under the hood, the methods use {@link DataView} to write the binary data into the buffer.
 * The {@link b8} method writes a full byte based on an array of 8 bits (0 or 1).
 * All 8, 16, 32 -bit methods work with a {@link number} (integer or floating-point).
 * All 64-bit floating-point methods work with a {@link number}.
 * All 64-bit integer methods work with a {@link bigint}.
 */

import BinarySeeker from "./seeker.ts";

/**
 * Sets the bit at the specified index in the byte to the specified value.
 *
 * @example
 * ```ts
 * import { byteSetBit } from "@hertzg/binseek/writer";
 * import { assertEquals } from "@std/assert";
 *
 * const byte = 0b10101010;
 *
 * assertEquals(byte.toString(2).padStart(8, '0'), '10101010');
 *
 * let result = byteSetBit(byte, 0, 1);
 * result = byteSetBit(result, 1, 0);
 * result = byteSetBit(result, 2, 1);
 * result = byteSetBit(result, 3, 0);
 * result = byteSetBit(result, 4, 1);
 * result = byteSetBit(result, 5, 0);
 * result = byteSetBit(result, 6, 1);
 * result = byteSetBit(result, 7, 0);
 *
 * assertEquals(result.toString(2).padStart(8, '0'), '01010101');
 * ```
 *
 * @param byte - The byte to set the bit in.
 * @param index - The index of the bit to set (0 for the least significant bit, up to 7).
 * @param value - The value to set the bit to (0 or 1).
 * @returns The byte with the bit set.
 */
export function byteSetBit(byte: number, index: number, value: number): number {
  return (byte & ~(1 << index)) | ((value != 0 ? 1 : 0) << index);
}

/**
 * BinaryWriter for writing binary data to a buffer.
 * The writer uses a {@link BinarySeeker} to navigate the buffer and write data.
 * The writer methods return the instance of the writer to allow chaining.
 * The writer methods write the data at the current cursor position and then advance the cursor by the specified length.
 * The writer never copies the data, always writes directly to the buffer.
 */
export default class BinaryWriter {
  #seeker: BinarySeeker;

  /**
   * Creates an instance of BinaryWriter.
   *
   * @param buffer - The buffer to write data into.
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
   * Gets the number of bytes left in the buffer from the current cursor position
   * to the end of the buffer.
   */
  get bytesLeft(): number {
    return this.#seeker.bytesLeft;
  }

  /**
   * Resets the cursor position to the beginning of the buffer.
   *
   * @returns The instance of the writer.
   */
  reset(): this {
    this.#seeker.reset();
    return this;
  }

  /**
   * Skips the specified number of bytes from the current cursor position.
   * Advances the cursor by the specified length.
   *
   * @param length - The number of bytes to skip.
   * @returns The instance of the writer.
   */
  skip(length: number): this {
    this.#seeker.skip(length);
    return this;
  }

  /**
   * Writes the specified bytes to the buffer at the current cursor position.
   * Advances the cursor by the number of bytes written.
   *
   * @param value - The bytes to write to the buffer as a Uint8Array or array of numbers.
   * @returns The instance of the writer.
   */
  bytes(value: Uint8Array | number[]): this {
    if (Array.isArray(value)) {
      value = new Uint8Array(value);
    }

    const bytes = this.#seeker.bytes(value.byteLength);
    bytes.set(value, 0);
    return this;
  }

  /**
   * Writes the specified bit array to the buffer as a byte.
   * The bit array should be an array of 8 bits (0 or 1).
   * Advances the cursor by 1 byte.
   *
   * @param value - An array of 8 bits (numbers 0 or 1).
   * @returns The instance of the writer.
   */
  b8(value: number[]): this {
    const bits = Array.from({ length: 8 }, (_, index) => value[index] ?? 0);
    const byte = bits.reduce(
      (acc, bit, index) => byteSetBit(acc, index, bit),
      0,
    );
    return this.u8(byte);
  }

  /**
   * Writes the specified unsigned 8-bit integer to the buffer.
   * Advances the cursor by 1 byte.
   *
   * @param value - The unsigned 8-bit integer to write.
   * @returns The instance of the writer.
   */
  u8(value: number): this {
    this.#seeker.view(1).setUint8(0, value);
    return this;
  }

  /**
   * Writes the specified signed 8-bit integer to the buffer.
   * Advances the cursor by 1 byte.
   *
   * @param value - The signed 8-bit integer to write.
   * @returns The instance of the writer.
   */
  s8(value: number): this {
    this.#seeker.view(1).setInt8(0, value);
    return this;
  }

  /**
   * Writes the specified unsigned 16-bit integer.
   * Alias for {@link u16be}.
   *
   * @param value - The unsigned 16-bit integer to write.
   * @returns The instance of the writer.
   */
  u16(value: number): this {
    return this.u16be(value);
  }

  /**
   * Writes the specified unsigned 16-bit integer in big-endian format to the buffer.
   * Advances the cursor by 2 bytes.
   *
   * @param value - The unsigned 16-bit integer to write.
   * @returns The instance of the writer.
   */
  u16be(value: number): this {
    this.#seeker.view(2).setUint16(0, value);
    return this;
  }

  /**
   * Writes the specified unsigned 16-bit integer in little-endian format to the buffer.
   * Advances the cursor by 2 bytes.
   *
   * @param value - The unsigned 16-bit integer to write.
   * @returns The instance of the writer.
   */
  u16le(value: number): this {
    this.#seeker.view(2).setUint16(0, value, true);
    return this;
  }

  /**
   * Writes the specified signed 16-bit integer.
   * Alias for {@link s16be}.
   *
   * @param value - The signed 16-bit integer to write.
   * @returns The instance of the writer.
   */
  s16(value: number): this {
    return this.s16be(value);
  }

  /**
   * Writes the specified signed 16-bit integer in big-endian format to the buffer.
   * Advances the cursor by 2 bytes.
   *
   * @param value - The signed 16-bit integer to write.
   * @returns The instance of the writer.
   */
  s16be(value: number): this {
    this.#seeker.view(2).setInt16(0, value);
    return this;
  }

  /**
   * Writes the specified signed 16-bit integer in little-endian format to the buffer.
   * Advances the cursor by 2 bytes.
   *
   * @param value - The signed 16-bit integer to write.
   * @returns The instance of the writer.
   */
  s16le(value: number): this {
    this.#seeker.view(2).setInt16(0, value, true);
    return this;
  }

  /**
   * Writes the specified 16-bit floating-point number.
   * Alias for {@link f16be}.
   *
   * @param value - The 16-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f16(value: number): this {
    return this.f16be(value);
  }

  /**
   * Writes the specified 16-bit floating-point number in big-endian format to the buffer.
   * Advances the cursor by 2 bytes.
   *
   * @param value - The 16-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f16be(value: number): this {
    this.#seeker.view(2).setFloat16(0, value);
    return this;
  }

  /**
   * Writes the specified 16-bit floating-point number in little-endian format to the buffer.
   * Advances the cursor by 2 bytes.
   *
   * @param value - The 16-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f16le(value: number): this {
    this.#seeker.view(2).setFloat16(0, value, true);
    return this;
  }

  /**
   * Writes the specified unsigned 32-bit integer.
   * Alias for {@link u32be}.
   *
   * @param value - The unsigned 32-bit integer to write.
   * @returns The instance of the writer.
   */
  u32(value: number): this {
    return this.u32be(value);
  }

  /**
   * Writes the specified unsigned 32-bit integer in big-endian format to the buffer.
   * Advances the cursor by 4 bytes.
   *
   * @param value - The unsigned 32-bit integer to write.
   * @returns The instance of the writer.
   */
  u32be(value: number): this {
    this.#seeker.view(4).setUint32(0, value);
    return this;
  }

  /**
   * Writes the specified unsigned 32-bit integer in little-endian format to the buffer.
   * Advances the cursor by 4 bytes.
   *
   * @param value - The unsigned 32-bit integer to write.
   * @returns The instance of the writer.
   */
  u32le(value: number): this {
    this.#seeker.view(4).setUint32(0, value, true);
    return this;
  }

  /**
   * Writes the specified signed 32-bit integer.
   * Alias for {@link s32be}.
   *
   * @param value - The signed 32-bit integer to write.
   * @returns The instance of the writer.
   */
  s32(value: number): this {
    return this.s32be(value);
  }

  /**
   * Writes the specified signed 32-bit integer in big-endian format to the buffer.
   * Advances the cursor by 4 bytes.
   *
   * @param value - The signed 32-bit integer to write.
   * @returns The instance of the writer.
   */
  s32be(value: number): this {
    this.#seeker.view(4).setInt32(0, value);
    return this;
  }

  /**
   * Writes the specified signed 32-bit integer in little-endian format to the buffer.
   * Advances the cursor by 4 bytes.
   *
   * @param value - The signed 32-bit integer to write.
   * @returns The instance of the writer.
   */
  s32le(value: number): this {
    this.#seeker.view(4).setInt32(0, value, true);
    return this;
  }

  /**
   * Writes the specified 32-bit floating-point number.
   * Alias for {@link f32be}.
   *
   * @param value - The 32-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f32(value: number): this {
    return this.f32be(value);
  }

  /**
   * Writes the specified 32-bit floating-point number in big-endian format to the buffer.
   * Advances the cursor by 4 bytes.
   *
   * @param value - The 32-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f32be(value: number): this {
    this.#seeker.view(4).setFloat32(0, value);
    return this;
  }

  /**
   * Writes the specified 32-bit floating-point number in little-endian format to the buffer.
   * Advances the cursor by 4 bytes.
   *
   * @param value - The 32-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f32le(value: number): this {
    this.#seeker.view(4).setFloat32(0, value, true);
    return this;
  }

  /**
   * Writes the specified unsigned 64-bit integer.
   * Alias for {@link u64be}.
   *
   * @param value - The unsigned 64-bit integer to write.
   * @returns The instance of the writer.
   */
  u64(value: bigint): this {
    return this.u64be(value);
  }

  /**
   * Writes the specified unsigned 64-bit integer in big-endian format to the buffer.
   * Advances the cursor by 8 bytes.
   *
   * @param value - The unsigned 64-bit integer to write.
   * @returns The instance of the writer.
   */
  u64be(value: bigint): this {
    this.#seeker.view(8).setBigUint64(0, value);
    return this;
  }

  /**
   * Writes the specified unsigned 64-bit integer in little-endian format to the buffer.
   * Advances the cursor by 8 bytes.
   *
   * @param value - The unsigned 64-bit integer to write.
   * @returns The instance of the writer.
   */
  u64le(value: bigint): this {
    this.#seeker.view(8).setBigUint64(0, value, true);
    return this;
  }

  /**
   * Writes the specified signed 64-bit integer.
   * Alias for {@link s64be}.
   *
   * @param value - The signed 64-bit integer to write.
   * @returns The instance of the writer.
   */
  s64(value: bigint): this {
    return this.s64be(value);
  }

  /**
   * Writes the specified signed 64-bit integer in big-endian format to the buffer.
   * Advances the cursor by 8 bytes.
   *
   * @param value - The signed 64-bit integer to write.
   * @returns The instance of the writer.
   */
  s64be(value: bigint): this {
    this.#seeker.view(8).setBigInt64(0, value);
    return this;
  }

  /**
   * Writes the specified signed 64-bit integer in little-endian format to the buffer.
   * Advances the cursor by 8 bytes.
   *
   * @param value - The signed 64-bit integer to write.
   * @returns The instance of the writer.
   */
  s64le(value: bigint): this {
    this.#seeker.view(8).setBigInt64(0, value, true);
    return this;
  }

  /**
   * Writes the specified 64-bit floating-point number.
   * Alias for {@link f64be}.
   *
   * @param value - The 64-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f64(value: number): this {
    return this.f64be(value);
  }

  /**
   * Writes the specified 64-bit floating-point number in big-endian format to the buffer.
   * Advances the cursor by 8 bytes.
   *
   * @param value - The 64-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f64be(value: number): this {
    this.#seeker.view(8).setFloat64(0, value);
    return this;
  }

  /**
   * Writes the specified 64-bit floating-point number in little-endian format to the buffer.
   * Advances the cursor by 8 bytes.
   *
   * @param value - The 64-bit floating-point number to write.
   * @returns The instance of the writer.
   */
  f64le(value: number): this {
    this.#seeker.view(8).setFloat64(0, value, true);
    return this;
  }
}
