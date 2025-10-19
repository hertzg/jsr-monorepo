/**
 * PNG (Portable Network Graphics) file format support for binary structure encoding and decoding.
 *
 * This module provides coders for PNG files and their constituent chunks, enabling
 * efficient binary serialization and deserialization of PNG data structures.
 *
 * The PNG format consists of a signature followed by a series of chunks, where each
 * chunk contains length, type, data, and CRC fields. This module handles the complete
 * PNG file structure as well as individual chunk encoding/decoding.
 *
 * @example Basic PNG file encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pngFile } from "@binstruct/png";
 *
 * const pngCoder = pngFile();
 * const testPng: PngFile = {
 *   signature: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
 *   chunks: [
 *     {
 *       length: 13,
 *       type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
 *       data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
 *       crc: 0x12345678,
 *     },
 *   ],
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = pngCoder.encode(testPng, buffer);
 * const [decodedPng, bytesRead] = pngCoder.decode(buffer);
 *
 * assertEquals(bytesRead, 93);
 * assertEquals(decodedPng.signature, testPng.signature);
 * assertEquals(decodedPng.chunks.length, 6);
 * ```
 *
 * @module
 */

import {
  arrayWhile,
  bytes,
  type Coder,
  type Context,
  createContext,
  decode,
  encode,
  ref,
  refine,
  Refiner,
  string,
  struct,
  u32be,
} from "@hertzg/binstruct";
import { crc32 } from "node:zlib";
import {
  IhdrChunk,
  ihdrChunk,
  IhdrChunkData,
  ihdrChunkRefiner,
} from "./chunks/ihdr.ts";
import { IdatChunk, idatChunkRefiner } from "./chunks/idat.ts";
import { IendChunk, iendChunkRefiner } from "./chunks/iend.ts";
import { PlteChunk, plteChunkRefiner } from "./chunks/plte.ts";
import { type } from "node:os";

/**
 * PNG file structure containing signature and chunks.
 *
 * A PNG file consists of an 8-byte signature followed by a series of chunks.
 * The signature is always the same: [137, 80, 78, 71, 13, 10, 26, 10].
 *
 * @example Creating a PNG file structure
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const pngFile: PngFile = {
 *   signature: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
 *   chunks: [
 *     {
 *       length: 13,
 *       type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
 *       data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
 *       crc: 0x12345678,
 *     },
 *   ],
 * };
 *
 * assertEquals(pngFile.signature.length, 8);
 * assertEquals(pngFile.chunks.length, 1);
 * ```
 */
export interface PngFile<TChunk> {
  /** The 8-byte PNG signature: [137, 80, 78, 71, 13, 10, 26, 10] */
  signature: Uint8Array;
  /** Array of PNG chunks in the file */
  chunks: TChunk[];
}

/**
 * Generic PNG chunk structure.
 *
 * Each PNG chunk consists of a 4-byte length field, 4-byte type field,
 * variable-length data, and 4-byte CRC checksum. The length field specifies
 * the number of bytes in the data field.
 *
 * @example Creating a PNG chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const chunk: PngChunk = {
 *   length: 13,
 *   type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
 *   data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
 *   crc: 0x12345678,
 * };
 *
 * assertEquals(chunk.length, chunk.data.length);
 * assertEquals(chunk.type.length, 4);
 * ```
 */
export interface PngChunkUnknown {
  /** Length of the data field in bytes (4-byte big-endian) */
  length: number;
  /** Type (4 bytes) */
  type: Uint8Array;
  /** Data (variable length) */
  data: Uint8Array;
  /** CRC (4 bytes) */
  crc: number;
}

export function pngChunkUnknown(): Coder<PngChunkUnknown> {
  const lengthCoder = u32be();
  return struct({
    length: lengthCoder,
    type: bytes(4),
    data: bytes(ref(lengthCoder)),
    crc: u32be(),
  });
}

export function pngFileChunks<TChunk>(
  chunkCoder: Coder<TChunk>,
): Coder<PngFile<TChunk>> {
  return struct({
    signature: bytes(8),
    chunks: arrayWhile(chunkCoder, ({ buffer }) => buffer.length >= 12),
  });
}

export function pngChunkRefined(): Coder<
  PngChunkUnknown | IhdrChunk | PlteChunk | IdatChunk | IendChunk
> {
  const typeCoder = string(4);
  const refiners = Object.freeze({
    IHDR: ihdrChunkRefiner(),
    PLTE: plteChunkRefiner(),
    IDAT: idatChunkRefiner(),
    IEND: iendChunkRefiner(),
  });

  const getRefiner = (type: unknown) => {
    if (type as string in refiners) {
      return refiners[type as keyof typeof refiners];
    }
    return undefined;
  };

  return refine(pngChunkUnknown(), {
    refine: (
      unrefined: PngChunkUnknown,
      buffer,
      context,
    ): PngChunkUnknown | IhdrChunk | PlteChunk | IdatChunk | IendChunk => {
      const type = decode(typeCoder, unrefined.type);

      const refiner = getRefiner(type);
      if (refiner) {
        return refiner.refine(unrefined, buffer, context);
      }

      return unrefined;
    },
    unrefine: (refined, buffer, context): PngChunkUnknown => {
      const refiner = getRefiner(refined.type);
      if (refiner) {
        return refiner.unrefine(refined as any, buffer, context);
      }

      return refined as PngChunkUnknown;
    },
  })();
}

export function pngFile() {
  return pngFileChunks(pngChunkRefined());
}

/**
 * Calculates the CRC32 checksum for PNG chunk data.
 *
 * This function can accept either raw bytes or a chunk object containing
 * type and data fields. When given a chunk object, it concatenates the
 * type and data fields before calculating the CRC.
 *
 * @param bytesOrChunk Either raw bytes or a chunk object with type and data
 * @returns The CRC32 checksum as a number
 *
 * @example Calculating CRC for raw bytes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { chunkCrc } from "@binstruct/png";
 *
 * const data = new Uint8Array([73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]);
 * const crc = chunkCrc(data);
 *
 * assertEquals(typeof crc, "number");
 * assertEquals(crc >= 0, true);
 * ```
 *
 * @example Calculating CRC for chunk object
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { chunkCrc } from "@binstruct/png";
 *
 * const chunk = {
 *   type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
 *   data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
 * };
 * const crc = chunkCrc(chunk);
 *
 * assertEquals(typeof crc, "number");
 * assertEquals(crc >= 0, true);
 * ```
 */
export function chunkCrc(bytes: Uint8Array): number;
export function chunkCrc(chunk: { type: Uint8Array; data: Uint8Array }): number;
export function chunkCrc(
  bytesOrChunk: Uint8Array | { type: Uint8Array; data: Uint8Array },
): number {
  let data: Uint8Array;
  if (bytesOrChunk instanceof Uint8Array) {
    data = bytesOrChunk;
  } else {
    data = new Uint8Array(bytesOrChunk.type.length + bytesOrChunk.data.length);
    data.set(bytesOrChunk.type, 0);
    data.set(bytesOrChunk.data, bytesOrChunk.type.length);
  }
  return crc32(data);
}
