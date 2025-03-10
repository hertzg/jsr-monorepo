/**
 * Gets the bytes from the buffer at the specified offset and length.
 * This is a simple wrapper around `buffer.subarray` that takes an offset and length.
 *
 * @param buffer - The buffer to get the bytes from.
 * @param offset - The offset to start getting bytes from.
 * @param length - The number of bytes to get.
 * @returns The bytes from the buffer at the specified offset and length.
 */
export function asBytes(
  buffer: Uint8Array,
  offset: number = 0,
  length: number = buffer.byteLength,
): Uint8Array {
  const _offset = buffer.byteOffset + offset;
  return new Uint8Array(
    buffer.buffer,
    _offset,
    length,
  );
}

/**
 * Gets a `DataView` from the buffer at the specified offset and length.
 * This is the same as {@link asBytes} but returns a `DataView` instead.
 *
 * @param {Uint8Array} buffer - The buffer to get the `DataView` from.
 * @param {number} offset - The offset to start getting the `DataView` from.
 * @param {number} length - The number of bytes to get.
 * @returns {DataView} The `DataView` from the buffer at the specified offset and length.
 */
export function asView(
  buffer: Uint8Array,
  offset?: number,
  length?: number,
): DataView {
  const bytes = asBytes(buffer, offset, length);
  return new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  );
}
