/**
 * A simple module for reading and writing binary data with a seekable cursor and without copying data.
 *
 * See {@link BinaryReader} and {@link BinaryWriter} for more information.
 *
 * @example View:
 * ```ts
 * import BinaryView from "@hertzg/binseek/view";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8]);
 * const view = new BinaryView(buffer);
 *
 * assertEquals(view.reset().get('u8'), 0xf1);
 * assertEquals(view.reset().get('u16'), 0xf1f2);
 * assertEquals(view.reset().get('u32'), 0xf1f2f3f4);
 * assertEquals(view.reset().get('u64'), 0xf1f2f3f4f5f6f7f8n);
 * ```
 *
 * @example Reader:
 * ```ts
 * import BinaryReader from "@hertzg/binseek/reader";
 * import { assertEquals } from "@std/assert";
 *
 * const original = new Uint8Array([0xff, 0x01, 0x02, 0x03, 0x04, 0xff]);
 * const buffer = original.subarray(1, 5);
 *
 * assertEquals(buffer, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
 * assertEquals(buffer.byteOffset, 1);
 * assertEquals(buffer.byteLength, 4);
 *
 * const reader = new BinaryReader(buffer);
 * assertEquals(reader.bytes(), new Uint8Array([0x01, 0x02, 0x03, 0x04]));
 * assertEquals(reader.cursor, 4);
 *
 * assertEquals(reader.reset().skip(2).bytes(1), new Uint8Array([0x03]));
 * assertEquals(reader.cursor, 3);
 * assertEquals(reader.bytesLeft, 1);
 *
 * assertEquals(reader.reset().u8(), 0x01);
 * assertEquals(reader.skip(1).u16(), 0x0304);
 * ```
 *
 * @example Writer:
 * ```ts
 * import BinaryWriter from "@hertzg/binseek/writer";
 * import { assertEquals } from "@std/assert";
 *
 * const original = new Uint8Array([0xff, 0x00, 0x00, 0x00, 0x00, 0xff]);
 * const buffer = original.subarray(1, 5);
 *
 * const writer = new BinaryWriter(buffer);
 *
 * writer.u8(0x01)
 *  .u8(0x02)
 *  .u16(0x0304);
 *
 * assertEquals(buffer, new Uint8Array([0x01, 0x02, 0x03, 0x04]));
 *
 * writer.reset()
 *   .u8(0x09)
 *   .u8(0x0A)
 *   .u16(0x0B0C);
 *
 * assertEquals(buffer, new Uint8Array([0x09, 0x0A, 0x0B, 0x0C]));
 * ```
 *
 * @example Seeker:
 * ```ts
 * import BinarySeeker from "@hertzg/binseek/seeker";
 * import { assertEquals } from "@std/assert";
 *
 * const buffer = new Uint8Array([0x01, 0x02, 0xff, 0x03, 0x04, 0xff]);
 * const seeker = new BinarySeeker(buffer);
 *
 * assertEquals(seeker.bytes(3), new Uint8Array([0x01, 0x02, 0xff]));
 * assertEquals(seeker.bytes(), new Uint8Array([0x03, 0x04, 0xff]));
 *
 * seeker.reset();
 * assertEquals(seeker.bytes(2), new Uint8Array([0x01, 0x02]));
 * assertEquals(seeker.skip(1).bytes(2), new Uint8Array([0x03, 0x04]));
 * assertEquals(seeker.bytes(), new Uint8Array([0xff]));
 * ```
 *
 * @module
 */

export { asBytes, asView } from "./util.ts";

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

/**
 * Gets or sets the bit at the specified index in the byte.
 *
 * @param byte - The byte to get or set the bit in.
 * @param index - The index of the bit to get or set.
 * @param value - The value to set the bit to. Should be 0 or 1.
 * @returns The bit value at the specified index (0 or 1) in the byte or the whole byte with the bit set.
 */
export function byteBit(byte: number, index: number, value?: number): number {
  return value === undefined
    ? readBit(byte, index)
    : writeBit(byte, index, value);
}
