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
 * import { pngFile, type PngChunkUnknown } from "@binstruct/png";
 *
 * const pngCoder = pngFile();
 * const testPng = {
 *   signature: {
 *     highBitByte: 137,
 *     signature: "PNG",
 *     dosEOF: "\u001a",
 *     dosLineEnding: "\r\n",
 *     unixLineEnding: "\n"
 *   },
 *   chunks: [
 *     {
 *       length: 13,
 *       type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
 *       data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
 *       crc: 0x12345678,
 *     } as PngChunkUnknown,
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
  decode,
  ref,
  type Refiner,
  refineSwitch,
  string,
  struct,
  u32be,
  u8,
} from "@hertzg/binstruct";
import { crc32 } from "node:zlib";
import { type IhdrChunk, ihdrChunkRefiner } from "./chunks/ihdr.ts";
import { type IdatChunk, idatChunkRefiner } from "./chunks/idat.ts";
import { type IendChunk, iendChunkRefiner } from "./chunks/iend.ts";
import { type PlteChunk, plteChunkRefiner } from "./chunks/plte.ts";
import { type TrnsChunk, trnsChunkRefiner } from "./chunks/trns.ts";

/**
 * PNG file structure containing signature and chunks.
 *
 * A PNG file consists of an 8-byte signature followed by a series of chunks.
 * The signature is always the same: {
 *   highBitByte: 137,
 *   signature: "PNG",
 *   dosEOF: "\u001a",
 *   dosLineEnding: "\r\n",
 *   unixLineEnding: "\n"
 * }.
 */
export interface PngFile<TChunk> {
  /** The 8-byte PNG signature: [137, 80, 78, 71, 13, 10, 26, 10] */
  signature: {
    highBitByte: number;
    signature: string;
    dosLineEnding: string;
    dosEOF: string;
    unixLineEnding: string;
  };
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
 * import type { PngChunkUnknown } from "@binstruct/png";
 *
 * const chunk: PngChunkUnknown = {
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
    signature: struct({
      highBitByte: u8(),
      signature: string(3),
      dosLineEnding: string(2),
      dosEOF: string(1),
      unixLineEnding: string(1),
    }),
    chunks: arrayWhile(chunkCoder, ({ buffer }) => buffer.length >= 12),
  });
}

export function pngChunkRefined(): Coder<
  PngChunkUnknown | IhdrChunk | PlteChunk | TrnsChunk | IdatChunk | IendChunk
> {
  const typeCoder = string(4);

  // Passthrough refiner for unknown chunk types
  const identityRefiner = (): Refiner<
    PngChunkUnknown,
    PngChunkUnknown,
    []
  > => ({
    refine: (chunk, _ctx) => chunk,
    unrefine: (chunk, _ctx) => chunk,
  });

  const coder = refineSwitch(
    pngChunkUnknown(),
    {
      IHDR: ihdrChunkRefiner(),
      PLTE: plteChunkRefiner(),
      tRNS: trnsChunkRefiner(),
      IDAT: idatChunkRefiner(),
      IEND: iendChunkRefiner(),
      UNKNOWN: identityRefiner(),
    },
    {
      refine: (chunk, ctx) => {
        const type = decode(typeCoder, chunk.type, ctx);
        // Return refiner key if known, otherwise use UNKNOWN passthrough
        return (type === "IHDR" || type === "PLTE" || type === "tRNS" ||
            type === "IDAT" || type === "IEND")
          ? type
          : "UNKNOWN";
      },
      unrefine: (chunk, _ctx) => {
        // For refined chunks, type is already a string
        const type = chunk.type as string;
        return (type === "IHDR" || type === "PLTE" || type === "tRNS" ||
            type === "IDAT" || type === "IEND")
          ? type as "IHDR" | "PLTE" | "tRNS" | "IDAT" | "IEND" | "UNKNOWN"
          : "UNKNOWN";
      },
    },
  );

  return coder;
}

export function pngFile(): Coder<
  PngFile<PngChunkUnknown | IhdrChunk | PlteChunk | TrnsChunk | IdatChunk | IendChunk>
> {
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
