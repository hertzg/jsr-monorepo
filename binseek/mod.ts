import BinarySeeker from "./seeker.ts";
import BinaryReader, { byteGetBit } from "./reader.ts";
import BinaryWriter, { byteSetBit } from "./writer.ts";

/**
 * A simple module for reading and writing binary data with a seekable cursor and without copying data.
 *
 * See {@link BinaryReader} and {@link BinaryWriter} for more information.
 *
 * @example Reader:
 * ```ts
 * import { BinaryReader } from "@hertzg/binseek";
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
 * import { BinaryWriter } from "@hertzg/binseek";
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
    ? byteGetBit(byte, index)
    : byteSetBit(byte, index, value);
}

export { BinaryReader, BinarySeeker, BinaryWriter };
