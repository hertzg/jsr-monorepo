/**
 * A module providing a class similar to DataView that allows for convenient reading and writing of binary data within
 * a buffer with a seekable cursor.
 *
 * The following formats are supported:
 * - Unsigned integers: 8, 16, 32, 64 bits
 * - Signed integers: 8, 16, 32, 64 bits
 * - Floating point numbers: 16, 32, 64 bits
 * - Bit arrays: 8+ bits (aligned to 1 byte)
 * - Byte arrays: any number of bytes
 *
 * To read data from the buffer, use the {@link BinaryView.get} method and to write data to the buffer, use the
 * {@link BinaryView.set} method.
 *
 * The {@link BinaryView.get} and {@link BinaryView.set} methods support reading and writing of the following data types:
 * - Unsigned integers: 8, 16, 32, 64 bits
 * - Signed integers: 8, 16, 32, 64 bits
 * - Floating point numbers: 16, 32, 64 bits
 * - Bit arrays: 8+ bits (aligned to 1 byte)
 * - Byte arrays: any number of bytes
 *
 * @example Reading and writing data:
 * ```ts
 * import { BinaryView } from "@hertzg/binseek";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([
 *   0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7,
 *   0xf8, 0xf9, 0xfa, 0xfb, 0xfc, 0xfd, 0xfe, 0xff
 * ]);
 *
 * const view = new BinaryView(buffer);
 *
 * assertEquals(view.get('u8'), 0xf1, 'u8');
 * assertEquals(view.get('u16'), 0xf2f3, 'u16');
 * assertEquals(view.get('u32'), 0xf4f5f6f7, 'u32');
 * assertEquals(view.get('u64'), 0xf8f9fafbfcfdfeffn, 'u64');
 *
 * assertEquals(
 *   view.reset()
 *       .set(0x01, 'u8')
 *       .set(0x0203, 'u16')
 *       .set(0x04050607, 'u32')
 *       .set(0x08090a0b0c0d0e0fn, 'u64')
 *       .reset().get(),
 *   new Uint8Array([
 *     0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07,
 *     0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
 *   ]),
 *   'set: u8, u16, u32, u64 examples'
 * );
 *
 * assertEquals(
 *    buffer,
 *    new Uint8Array([
 *      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
 *      0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f
 *    ]),
 *    'original should be modified as well'
 * );
 * ```
 * @module
 */
import { type BigIntFormat, type NumberFormat, numeric } from "./numeric.ts";

export type BinaryViewFormat = "binary";

export function isArrayLike<T>(value: unknown): value is ArrayLike<T> {
  return value !== null && typeof value === "object" && "length" in value &&
    typeof value.length === "number";
}

/**
 * A class for reading binary data from a buffer with a seekable cursor.
 *
 * See {@link BinaryView.get} and {@link BinaryView.set} for more information on reading and writing data.
 * The {@link BinaryView.bytes} can be used in conjunction with {@link BinaryView.set} to get the constructed buffer.
 */
export class BinaryView<T extends ArrayBufferLike = ArrayBuffer> {
  #buffer: Uint8Array<T>;
  #cursor = 0;

  /**
   * Creates a new BinaryView instance with the given buffer.
   * The cursor is set to the beginning of the buffer, respecting the byteOffset of the buffer.
   *
   * @param buffer
   */
  constructor(buffer: Uint8Array<T>) {
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
  get(): Uint8Array<T>;
  get(byteLength: number): Uint8Array<T>;
  get(format: NumberFormat): number;
  get(format: BigIntFormat): bigint;
  get(
    formatOrByteLength?: NumberFormat | BigIntFormat | number,
  ): Uint8Array<T> | number | bigint;
  get(
    formatOrByteLength?: NumberFormat | BigIntFormat | number,
  ): Uint8Array<T> | number | bigint {
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

    const { byteLength: byteLength, value } = numeric(
      this.#buffer,
      this.#cursor,
      formatOrByteLength,
    );
    this.seek(byteLength);

    return value;
  }

  /**
   * Writes the value to the buffer according to the given format and advances the cursor accordingly.
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
   *   view
   *    .set(42, 'u8')
   *    .set(42, 'u16')
   *    .set(42, 'u32')
   *    .set(42n, 'u64')
   *    .set(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
   *    .build(),
   *
   *   new Uint8Array([
   *    42, 0, 42, 0, 0, 0, 42, 0, 0, 0, 0, 0, 0, 0, 42,
   *    1, 2, 3, 4, 5, 6, 7, 8
   *   ])
   * );
   * ```
   *
   * @param value - The data to write.
   * @param format - The format of the data to write.
   * @throws {Error} If the format string is invalid.
   * @throws {Error} If the cursor is out of bounds. See {@link BinaryView.seek}.
   * @returns {this} The instance of the BinaryView for chaining.
   */
  set(value: ArrayLike<number>): this;
  set(value: number, format: NumberFormat): this;
  set(value: bigint, format: BigIntFormat): this;
  set(value: number | bigint, format: NumberFormat | BigIntFormat): this;
  set(
    value:
      | ArrayLike<number>
      | number
      | bigint,
    format?: NumberFormat | BigIntFormat | BinaryViewFormat,
  ): this;
  set(
    value:
      | ArrayLike<number>
      | number
      | bigint,
    format: NumberFormat | BigIntFormat | BinaryViewFormat = "binary",
  ): this {
    let seekLength = 0;
    switch (format) {
      case "binary":
        if (isArrayLike<number>(value)) {
          this.#buffer.set(value, this.#cursor);
          seekLength = value.length;
        }
        break;
      default:
        {
          if (typeof value === "number" || typeof value === "bigint") {
            const { byteLength } = numeric(
              this.#buffer,
              this.#cursor,
              format,
              value,
            );
            seekLength = byteLength;
          }
        }
        break;
    }

    this.seek(seekLength);
    return this;
  }

  /**
   * Returns a view of the buffer from the byteOffset to the cursor. Useful for getting a view of the buffer that was
   * read or written up until the current cursor position.
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
   *     //.set([1, 0, 1, 0, 1, 0, 1, 0])
   *     .set(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))
   *     .build(),
   *   new Uint8Array([
   *      42, 0, 42, 0, 0, 0, 42, 0, 0, 0, 0, 0, 0, 0, 42,
   *      1, 2, 3, 4, 5, 6, 7, 8
   *   ])
   * );
   * ```
   *
   * @returns {Uint8Array<T>} A view of the buffer from the byteOffset to the cursor.
   */
  build(): Uint8Array<T> {
    return new Uint8Array(
      this.#buffer.buffer,
      this.#buffer.byteOffset,
      this.#cursor,
    );
  }
}

export type ValueWithByteLength<T = undefined> = {
  byteLength: number;
  value: T;
};
