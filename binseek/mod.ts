/**
 * A module providing a class similar to DataView that allows for convenient reading and writing of binary data within
 * a buffer with a seekable cursor.
 *
 * The following formats are supported:
 * - Unsigned integers: 8, 16, 32, 64 bits
 * - Signed integers: 8, 16, 32, 64 bits
 * - Floating point numbers: 16, 32, 64 bits
 * - Bit arrays: 8 bits
 * - Byte arrays: any number of bytes
 *
 * To read data from the buffer, use the {@link BinaryView.get} method and to write data to the buffer, use the
 * {@link BinaryView.set} method.
 *
 * The {@link BinaryView.get} and {@link BinaryView.set} methods support reading and writing of the following data types:
 * - Unsigned integers: 8, 16, 32, 64 bits
 * - Signed integers: 8, 16, 32, 64 bits
 * - Floating point numbers: 16, 32, 64 bits
 * - Bit arrays: 8 bits
 * - Byte arrays: any number of bytes
 *
 * @example Reading and writing data:
 * ```ts
 * import { BinaryView } from "@hertzg/binseek";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([
 *   0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8,
 *   0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff
 * ]);
 *
 * const view = new BinaryView(buffer);
 *
 * assertEquals(view.get('u8'), 0xf1);
 * assertEquals(view.get('u16'), 0xf2f3);
 * assertEquals(view.get('u32'), 0xf4f5f6f7);
 * assertEquals(view.get('u64'), 0xf8f9fafbfcfdfeffn);
 *
 * assertEquals(
 *   view.reset()
 *       .set(0x01, 'u8')
 *       .set(0x02f3, 'u16')
 *       .set(0x04050607, 'u32')
 *       .set(0x08090a0b0c0d0e0fn, 'u64')
 *       .reset().get(),
 *   new Uint8Array([
 *     0x01, 0x02, 0xf3, 0x04, 0x05, 0x06, 0x07, 0x08,
 *     0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
 *   ])
 * );
 *
 * assertEquals(buffer, new Uint8Array([
 *    0x01, 0x02, 0xf3, 0x04, 0x05, 0x06, 0x07, 0x08,
 *    0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
 * ]));
 * ```
 * @module
 */

/**
 * A union of all formats supported by BinaryView that return an array of bits.
 */
export type BitFormats = `b${8}`;

/**
 * A union of all formats supported by BinaryView that return a number.
 */
export type NumberFormats =
  | `${"u" | "s"}${8}`
  | `${"u" | "s"}${8}${"be" | "le"}`
  | `${"u" | "s" | "f"}${16 | 32}`
  | `${"u" | "s" | "f"}${16 | 32}${"be" | "le"}`
  | `f${64}`
  | `f${64}${"be" | "le"}`;

/**
 * A union of all formats supported by BinaryView that return a bigint.
 */
export type BigIntFormats =
  | `${"u" | "s"}${64}`
  | `${"u" | "s"}${64}${"be" | "le"}`;

const dataViewMethods = Object.seal({
  "u8": "Uint8" as const,
  "u8be": "Uint8" as const,
  "u8le": "Uint8" as const,
  "s8": "Int8" as const,
  "s8be": "Int8" as const,
  "s8le": "Int8" as const,
  "u16": "Uint16" as const,
  "u16be": "Uint16" as const,
  "u16le": "Uint16" as const,
  "s16": "Int16" as const,
  "s16be": "Int16" as const,
  "s16le": "Int16" as const,
  "f16": "Float16" as const,
  "f16be": "Float16" as const,
  "f16le": "Float16" as const,
  "u32": "Uint32" as const,
  "u32be": "Uint32" as const,
  "u32le": "Uint32" as const,
  "s32": "Int32" as const,
  "s32be": "Int32" as const,
  "s32le": "Int32" as const,
  "f32": "Float32" as const,
  "f32be": "Float32" as const,
  "f32le": "Float32" as const,
  "u64": "BigUint64" as const,
  "u64be": "BigUint64" as const,
  "u64le": "BigUint64" as const,
  "s64": "BigInt64" as const,
  "s64be": "BigInt64" as const,
  "s64le": "BigInt64" as const,
  "f64": "Float64" as const,
  "f64be": "Float64" as const,
  "f64le": "Float64" as const,
});

/**
 * A class for reading binary data from a buffer with a seekable cursor.
 *
 * See {@link BinaryView.get} and {@link BinaryView.set} for more information on reading and writing data.
 * The {@link BinaryView.bytes} can be used in conjunction with {@link BinaryView.set} to get the constructed buffer.
 */
export class BinaryView {
  #buffer: Uint8Array;
  #cursor = 0;

  /**
   * Creates a new BinaryView instance with the given buffer.
   * The cursor is set to the beginning of the buffer, respecting the byteOffset of the buffer.
   *
   * @param buffer
   */
  constructor(buffer: Uint8Array) {
    this.#buffer = buffer;
  }

  /**
   * The buffer that the view is reading from.
   */
  get buffer(): Uint8Array {
    return this.#buffer;
  }

  /**
   * The current position of the cursor in the buffer.
   */
  get cursor(): number {
    return this.#cursor;
  }

  /**
   * The number of bytes left in the buffer from the cursor until the end of buffer.
   */
  get bytesLeft(): number {
    return this.#buffer.byteLength - this.#cursor;
  }

  /**
   * Resets the cursor to the beginning of the buffer.
   */
  reset(): this {
    this.#cursor = 0;
    return this;
  }

  /**
   * Moves the cursor by the given offset.
   *
   * @param bytes - The number of bytes to move the cursor by. Can be negative to move the cursor backwards.
   * @throws {Error} If the new cursor position is out of bounds.
   */
  seek(bytes: number): this {
    const cursor = this.#cursor + bytes;
    if (cursor < 0 || cursor > this.#buffer.byteLength) {
      throw new Error(
        `seek: offset out of bounds: must be: 0 <= ${bytes} <= ${this.#buffer.byteLength}`,
      );
    }
    this.#cursor = cursor;
    return this;
  }

  /**
   * Reads data from the buffer according to the given format and advances the cursor accordingly.
   *
   * Passing a number will return a Uint8Array view of the buffer starting from the current cursor position with the
   * given number as the byte length.
   *
   * Passing a format string will return the data read from the buffer according to the format. The format string is in
   * the following format `"<type><byteLength><endianness>"`. Endianness is optional and defaults to big-endian (be).
   *
   * Types of data that can be read:
   * - `b` - Array of bits (1 byte)
   * - `u` - Unsigned integer
   * - `s` - Signed integer
   * - `f` - Floating point number
   *
   * Byte length can be any of the following:
   * - `8` - 1 byte - returns a number
   * - `16` - 2 bytes - returns a number
   * - `32` - 4 bytes - returns a number
   * - `64` - 8 bytes - returns a number (floats) or bigint
   *
   * Endianness can be either (can be skipped all together):
   * - `be` - Big endian (default)
   * - `le` - Little endian
   *
   * Passing 0 arguments will return a Uint8Array view of the buffer starting from the current cursor position with the
   * remaining bytes in the buffer.
   *
   * In all cases the underlying buffer is not copied, only a view is returned with adjusted byteOffset and byteLength.
   *
   * @param format - The format of the data to read.
   * @throws {Error} If the format string is invalid.
   * @throws {Error} If the cursor is out of bounds. See {@link BinaryView.seek}.
   */
  get(format: BitFormats): number[];
  get(format: NumberFormats): number;
  get(format: BigIntFormats): bigint;
  get(byteLength?: number): Uint8Array;
  get(
    formatOrByteLength?: BitFormats | NumberFormats | BigIntFormats | number,
  ): number[] | number | bigint | Uint8Array {
    if (typeof formatOrByteLength === "number" || formatOrByteLength == null) {
      const byteLength = formatOrByteLength ?? this.bytesLeft;
      const bytes = new Uint8Array(
        this.#buffer.buffer,
        this.#buffer.byteOffset + this.#cursor,
        byteLength,
      );
      this.seek(byteLength);
      return bytes;
    }

    const format = formatOrByteLength;
    if (format === "b8") {
      const byte = this.get("u8");
      return Array.from({ length: 8 }, (_, index) => readBit(byte, index))
        .reverse();
    } else {
      const isLittle = format.endsWith("le");

      const bitLength = format.endsWith("be") || isLittle
        ? Number(format.slice(1, -2))
        : Number(format.slice(1));

      if (isNaN(bitLength)) {
        throw new Error(`get: invalid byteLength: ${format}`);
      }
      const byteLength = ~~(bitLength / 8);

      const method: keyof DataView = `get${dataViewMethods[format]}`;
      const view = new DataView(
        this.#buffer.buffer,
        this.#buffer.byteOffset + this.#cursor,
        byteLength,
      );
      this.seek(byteLength);
      return view[method](0, isLittle);
    }
  }

  /**
   * Writes the value to the buffer according to the given format and advances the cursor accordingly.
   *
   * Passing an array of numbers will write the array as a bit array to the buffer. The array must be an array of 8
   * numbers representing the bits to write. Optionally, format can be set to "b8" but it is redundant.
   *
   * Passing a number or bigint will write the number to the buffer according to the format. The format string must be
   * one of the formats defined in the {@link BinaryView.get} method.
   *
   * Passing a Uint8Array will write the array to the buffer. The entire array will be copied into the buffer.
   *
   * @example
   * ```ts
   * import { BinaryView } from "@hertzg/binseek";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array(4096);
   * const view = new BinaryView(buffer);
   *
   * assertEquals(
   *   view.set(42, 'u8')
   *    .set(42, 'u16')
   *    .set(42, 'u32')
   *    .set(42n, 'u64')
   *    .set([1, 0, 1, 0, 1, 0, 1, 0])
   *    .set(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
   *    .reset().get()
   *
   * @param value - The data to write.
   * @param format - The format of the data to write.
   * @throws {Error} If the format string is invalid.
   * @throws {Error} If the cursor is out of bounds. See {@link BinaryView.seek}.
   * @returns {this} The instance of the BinaryView for chaining.
   */
  set(value: number[], format?: BitFormats): this;
  set(value: number, format: NumberFormats): this;
  set(value: bigint, format: BigIntFormats): this;
  set(value: Uint8Array): this;
  set(
    value: number[] | number | bigint | Uint8Array,
    format?: BitFormats | NumberFormats | BigIntFormats,
  ): this {
    if (value instanceof Uint8Array) {
      this.#buffer.set(value, this.#cursor);
      this.seek(value.byteLength);
    } else if (Array.isArray(value)) {
      if (value.length !== 8) {
        throw new Error(
          `write: bit array must be an array of 8 bits, got ${value.length}`,
        );
      }

      const byte = value.slice().reverse().reduce(
        (byte, bit, index) => writeBit(byte, index, bit),
        0,
      );
      return this.set(byte, "u8");
    } else if (format != null && format != "b8") {
      const isLittle = format.endsWith("le");

      const bitLength = format.endsWith("be") || isLittle
        ? Number(format.slice(1, -2))
        : Number(format.slice(1));

      if (isNaN(bitLength)) {
        throw new Error(`set: invalid byteLength: ${format}`);
      }
      const byteLength = ~~(bitLength / 8);

      type FormatKey = keyof typeof dataViewMethods;
      type MethodName<K extends FormatKey> =
        `set${(typeof dataViewMethods)[K]}`;
      const method: MethodName<typeof format> = `set${dataViewMethods[format]}`;
      const view = new DataView(
        this.#buffer.buffer,
        this.#buffer.byteOffset + this.#cursor,
        byteLength,
      );
      (view[method] as (
        offset: number,
        value: bigint | number,
        little: boolean,
      ) => void)(0, value, isLittle);
      this.seek(byteLength);
    }

    return this;
  }

  /**
   * Returns a view of the buffer from the byteOffset to the cursor. Useful for getting a view of the buffer that was
   * read or written to up until the current cursor position.
   *
   * @example
   * ```ts
   * import { BinaryView } from "@hertzg/binseek";
   * import { assertEquals } from "@std/assert";
   *
   * // Create a buffer big enough to hold all the data
   * const buffer = new Uint8Array(4096);
   * const view = new BinaryView(buffer);
   *
   * assertEquals(
   *   view.set(42, 'u8')
   *     .set(42, 'u16')
   *     .set(42, 'u32')
   *     .set(42n, 'u64')
   *     .set([1, 0, 1, 0, 1, 0, 1, 0])
   *     .set(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
   *     .bytes(),
   *   new Uint8Array([
   *      42, 0, 42, 0, 0, 0, 42, 0, 0, 0, 0, 0, 0, 0, 42,
   *      170, 1, 2, 3, 4, 5, 6, 7, 8
   *   ])
   * );
   * ```
   *
   * @returns {Uint8Array} A view of the buffer from the byteOffset to the cursor.
   */
  bytes(): Uint8Array {
    return new Uint8Array(
      this.#buffer.buffer,
      this.#buffer.byteOffset,
      this.#cursor,
    );
  }
}

/**
 * Retrieves the bit value at a specific index from a given byte.
 *
 * @example
 * ```ts
 * import { readBit } from "@hertzg/binseek";
 * import { assertEquals } from "@std/assert";
 *
 * const byte = 0b10000001;
 *
 * assertEquals(readBit(byte, 0), 1);
 * assertEquals(readBit(byte, 1), 0);
 * assertEquals(readBit(byte, 2), 0);
 * assertEquals(readBit(byte, 3), 0);
 * assertEquals(readBit(byte, 4), 0);
 * assertEquals(readBit(byte, 5), 0);
 * assertEquals(readBit(byte, 6), 0);
 * assertEquals(readBit(byte, 7), 1);
 * ```
 *
 * @param {number} byte - The byte from which to extract the bit.
 * @param {number} index - The bit position (0 for least significant bit, up to 7).
 * @returns {number} The bit value (0 or 1) at the specified index.
 */
export function readBit(byte: number, index: number): number {
  return (byte & (1 << index)) >> index;
}

/**
 * Sets the bit at the specified index in the byte to the specified value.
 *
 * @example
 * ```ts
 * import { writeBit } from "@hertzg/binseek";
 * import { assertEquals } from "@std/assert";
 *
 * const byte = 0b10101010;
 *
 * assertEquals(byte.toString(2).padStart(8, '0'), '10101010');
 *
 * let result = writeBit(byte, 0, 1);
 * result = writeBit(result, 1, 0);
 * result = writeBit(result, 2, 1);
 * result = writeBit(result, 3, 0);
 * result = writeBit(result, 4, 1);
 * result = writeBit(result, 5, 0);
 * result = writeBit(result, 6, 1);
 * result = writeBit(result, 7, 0);
 *
 * assertEquals(result.toString(2).padStart(8, '0'), '01010101');
 * ```
 *
 * @param byte - The byte to set the bit in.
 * @param index - The index of the bit to set (0 for the least significant bit, up to 7).
 * @param value - The value to set the bit to (0 or 1).
 * @returns The byte with the bit set.
 */
export function writeBit(byte: number, index: number, value: number): number {
  return (byte & ~(1 << index)) | ((value != 0 ? 1 : 0) << index);
}
