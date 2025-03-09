/**
 * This module provides functionality for navigating and seeking through a binary buffer.
 *
 * This keeps track of a cursor position within the buffer, and provides methods for reading
 * and navigating through the buffer. The cursor can be advanced by a specified number of bytes.
 *
 * Provides {@link BinarySeeker.prototype.peekView} and {@link BinarySeeker.prototype.peekBytes} class to peek within
 * the buffer without modifying the cursor.
 *
 * Methods {@link BinarySeeker.prototype.view} and {@link BinarySeeker.prototype.bytes} return a view of the buffer
 * starting at the current cursor position and then advance the cursor by the specified length.
 *
 * Never copies the data, always returns a view into the buffer.
 *
 * @example
 * ```ts
 * import BinarySeeker from "@hertzg/binseek/seeker";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0xff, 0x03, 0x04, 0xff]);
 *
 * const seeker = new BinarySeeker(buffer);
 * assertEquals(seeker.cursor, 0);
 * assertEquals(seeker.bytesLeft, 7);
 *
 * seeker.skip(1);
 * assertEquals(seeker.cursor, 1);
 *
 * assertEquals(seeker.bytes(2), new Uint8Array([0x01, 0x02]));
 * assertEquals(seeker.cursor, 3);
 *
 * const view = seeker.view(1);
 * assertEquals(seeker.cursor, 4);
 * assertEquals(view.getUint8(0), 0xff);
 * ```
 *
 * @module seeker
 */

/**
 * BinarySeeker for navigating a binary buffer.
 * Seek and Peek methods return a view into the buffer without copying the data see {@link Uint8Array.prototype.subarray}.
 */
export default class BinarySeeker {
  /**
   * The internal buffer containing the binary data.
   */
  #buffer: Uint8Array;

  /**
   * The current position (cursor) within the buffer.
   */
  #cursor = 0;

  /**
   * Creates an instance of BinarySeeker.
   *
   * @param buffer - The Uint8Array buffer to read from.
   */
  constructor(buffer: Uint8Array) {
    this.#buffer = buffer;
  }

  /**
   * Gets the current cursor position within the buffer relative to the buffer offset.
   */
  get cursor(): number {
    return this.#cursor;
  }

  /**
   * Gets the number of bytes remaining in the buffer from the current cursor position.
   */
  get bytesLeft(): number {
    return this.#buffer.byteLength - this.#cursor;
  }

  /**
   * Resets the cursor to the start.
   *
   * @example
   * ```ts
   * import BinarySeeker from "@hertzg/binseek/seeker";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
   * const seeker = new BinarySeeker(buffer);
   * assertEquals(seeker.cursor, 0);
   *
   * seeker.skip(4);
   * assertEquals(seeker.cursor, 4);
   *
   * seeker.reset();
   * assertEquals(seeker.cursor, 0);
   * ```
   *
   * @returns {BinarySeeker} The instance for chaining.
   */
  reset(): this {
    this.#cursor = 0;
    return this;
  }

  /**
   * Advances the cursor by the specified offset. The offset can be positive or negative to seek forward or backward.
   *
   * @example
   * ```ts
   * import BinarySeeker from "@hertzg/binseek/seeker";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
   * const seeker = new BinarySeeker(buffer);
   * assertEquals(seeker.cursor, 0);
   *
   * seeker.skip(4);
   * assertEquals(seeker.cursor, 4);
   *
   * seeker.skip(-1);
   * assertEquals(seeker.cursor, 3);
   * ```
   *
   * @param offset - The number of bytes to skip. Can be positive or negative.
   * @throws {Error} Throws an error if the new cursor position would be out of bounds.
   *
   * @returns {BinarySeeker} The instance for chaining.
   */
  skip(offset: number): this {
    const targetOffset = this.#cursor + offset;
    if (targetOffset < 0 || targetOffset > this.#buffer.byteLength) {
      throw new Error("Skip out of bounds");
    }

    this.#cursor += offset;

    return this;
  }

  /**
   * Returns a subview {@link Uint8Array} of the buffer based on the specified offset and length.
   *
   * Does not advance the cursor.
   * Does not copy the data, provides a view into the buffer.
   *
   * @example
   * ```ts
   * import BinarySeeker from "@hertzg/binseek/seeker";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
   * const seeker = new BinarySeeker(buffer);
   *
   * const bytes = seeker.peekBytes(1, 4);
   * assertEquals(seeker.cursor, 0);
   * assertEquals(bytes.buffer, buffer.buffer);
   * assertEquals(bytes.byteOffset, 1);
   * assertEquals(bytes.byteLength, 4);
   * assertEquals(bytes, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
   * ```
   *
   * @param offset - Optional offset. Defaults to the current cursor position.
   * @param length - Optional number of bytes to peek. Defaults to the remainder of the buffer.
   * @returns {Uint8Array} subarray of the buffer.
   */
  peekBytes(offset?: number, length?: number): Uint8Array {
    const _offset = this.#buffer.byteOffset + (offset ?? this.#cursor);
    return new Uint8Array(
      this.#buffer.buffer,
      _offset,
      length ?? this.#buffer.byteLength,
    );
  }

  /**
   * Returns a {@link Uint8Array} of the specified length from the current cursor position,
   * and then advances the cursor by that length.
   *
   * Advances the cursor by the specified length.
   * Does not copy the data, provides a view into the buffer.
   *
   * @example
   * ```ts
   * import BinarySeeker from "@hertzg/binseek/seeker";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
   * const seeker = new BinarySeeker(buffer);
   * assertEquals(seeker.cursor, 0);
   *
   * const bytes = seeker.bytes(2);
   * assertEquals(seeker.cursor, 2);
   * assertEquals(bytes, new Uint8Array([0xff, 0x01]));
   * assertEquals(bytes.buffer, buffer.buffer);
   * ```
   *
   * @param {number} length - The number of bytes to return. Defaults to the remainder of the buffer.
   * @returns {Uint8Array} A Uint8Array representing the specified slice.
   */
  bytes(length: number = this.bytesLeft): Uint8Array {
    const bytes = this.peekBytes(this.#cursor, length);
    this.skip(length);
    return bytes;
  }

  /**
   * Returns a {@link DataView} of the subview {@link peekBytes} based on the specified offset and length.
   *
   * Does not advance the cursor.
   * Does not copy the data, provides a view into the buffer.
   *
   * @example
   * ```ts
   * import BinarySeeker from "@hertzg/binseek/seeker";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
   * const seeker = new BinarySeeker(buffer);
   *
   * const view = seeker.peekView(1, 4);
   * assertEquals(seeker.cursor, 0);
   * assertEquals(view.buffer, buffer.buffer);
   * assertEquals(view.byteOffset, 1);
   * assertEquals(view.byteLength, 4);
   * assertEquals(view.getUint16(0), 0x0102);
   * ```
   *
   * @param offset - Optional offset from the current cursor position to start peeking.
   * @param length - Optional number of bytes to peek. Defaults to the remainder of the buffer.
   * @returns {DataView} representing the slice.
   */
  peekView(offset?: number, length?: number): DataView {
    const buffer = this.peekBytes(offset, length);
    return new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  }

  /**
   * Returns a {@link DataView} of the specified length starting at the current cursor position,
   * and then advances the cursor by that length.
   *
   * Advances the cursor by the specified length.
   * Does not copy the data, provides a view into the buffer.
   *
   * @example
   * ```ts
   * import BinarySeeker from "@hertzg/binseek/seeker";
   * import { assertEquals } from "@std/assert";
   *
   * const buffer = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
   * const seeker = new BinarySeeker(buffer);
   * assertEquals(seeker.cursor, 0);
   *
   * const view = seeker.view(2);
   * assertEquals(seeker.cursor, 2);
   * assertEquals(view.buffer, buffer.buffer);
   * assertEquals(view.getUint8(0), 0xff);
   * assertEquals(view.getUint8(1), 0x01);
   * ```
   *
   * @param {number} length - The number of bytes for the DataView.
   * @returns {DataView} A DataView representing the specified slice.
   */
  view(length: number): DataView {
    const view = this.peekView(this.#cursor, length);
    this.skip(length);
    return view;
  }
}
