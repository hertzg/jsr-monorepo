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
import { crc32 } from "@hertzg/crc";

// Chunk types and refiners - re-exported for public API and used internally
import { type IhdrChunk, ihdrChunkRefiner } from "./chunks/ihdr.ts";
import { type IdatChunk, idatChunkRefiner } from "./chunks/idat.ts";
import { type IendChunk, iendChunkRefiner } from "./chunks/iend.ts";
import { type PlteChunk, plteChunkRefiner } from "./chunks/plte.ts";
import { type TrnsChunk, trnsChunkRefiner } from "./chunks/trns.ts";
import { type BkgdChunk, bkgdChunkRefiner } from "./chunks/bkgd.ts";

export type {
  BkgdChunk,
  IdatChunk,
  IendChunk,
  IhdrChunk,
  PlteChunk,
  TrnsChunk,
};
export {
  bkgdChunkRefiner,
  idatChunkRefiner,
  iendChunkRefiner,
  ihdrChunkRefiner,
  plteChunkRefiner,
  trnsChunkRefiner,
};

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

/**
 * Creates a coder for unknown/generic PNG chunks.
 *
 * This coder handles the basic PNG chunk structure without any type-specific
 * refinement. It encodes/decodes the length, type, data, and CRC fields.
 *
 * @returns A coder for {@link PngChunkUnknown} structures.
 *
 * @example Encode and decode an unknown chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pngChunkUnknown, type PngChunkUnknown } from "@binstruct/png";
 *
 * const coder = pngChunkUnknown();
 * const chunk: PngChunkUnknown = {
 *   length: 4,
 *   type: new Uint8Array([116, 69, 88, 116]), // "tEXt"
 *   data: new Uint8Array([84, 101, 115, 116]), // "Test"
 *   crc: 0x12345678,
 * };
 *
 * const buffer = new Uint8Array(20);
 * const bytesWritten = coder.encode(chunk, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, bytesRead);
 * assertEquals(decoded.length, chunk.length);
 * assertEquals(decoded.type, chunk.type);
 * assertEquals(decoded.data, chunk.data);
 * ```
 */
export function pngChunkUnknown(): Coder<PngChunkUnknown> {
  const lengthCoder = u32be();
  return struct({
    length: lengthCoder,
    type: bytes(4),
    data: bytes(ref(lengthCoder)),
    crc: u32be(),
  });
}

/**
 * Creates a coder for PNG files with a custom chunk coder.
 *
 * This function allows you to specify how individual chunks should be
 * encoded/decoded, enabling custom chunk handling or type-specific refinement.
 *
 * @template TChunk The type of chunks in the PNG file.
 * @param chunkCoder The coder to use for encoding/decoding individual chunks.
 * @returns A coder for {@link PngFile} structures with the specified chunk type.
 *
 * @example Create a PNG file coder with unknown chunks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pngFileChunks, pngChunkUnknown, type PngChunkUnknown } from "@binstruct/png";
 *
 * const coder = pngFileChunks(pngChunkUnknown());
 * const png = {
 *   signature: {
 *     highBitByte: 137,
 *     signature: "PNG",
 *     dosLineEnding: "\r\n",
 *     dosEOF: "\u001a",
 *     unixLineEnding: "\n",
 *   },
 *   chunks: [] as PngChunkUnknown[],
 * };
 *
 * const buffer = new Uint8Array(8);
 * const bytesWritten = coder.encode(png, buffer);
 *
 * assertEquals(bytesWritten, 8); // Just the signature
 * ```
 */
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

/**
 * Creates a coder for PNG chunks with type-specific refinement.
 *
 * This coder automatically detects the chunk type and applies the appropriate
 * refiner, transforming raw chunk data into structured objects for known chunk
 * types (IHDR, PLTE, tRNS, bKGD, IDAT, IEND). Unknown chunk types are passed
 * through as {@link PngChunkUnknown}.
 *
 * @returns A coder that produces refined chunk types based on the chunk's type field.
 *
 * @example Decode a PNG with refined chunks
 * ```ts
 * import { assert } from "@std/assert";
 * import { pngChunkRefined, pngFileChunks } from "@binstruct/png";
 *
 * const coder = pngFileChunks(pngChunkRefined());
 *
 * // When decoding a PNG file, chunks will be automatically refined
 * // to their specific types (IhdrChunk, PlteChunk, etc.)
 * assert(typeof coder.decode === "function");
 * assert(typeof coder.encode === "function");
 * ```
 */
export function pngChunkRefined(): Coder<
  | PngChunkUnknown
  | IhdrChunk
  | PlteChunk
  | TrnsChunk
  | BkgdChunk
  | IdatChunk
  | IendChunk
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
      bKGD: bkgdChunkRefiner(),
      IDAT: idatChunkRefiner(),
      IEND: iendChunkRefiner(),
      UNKNOWN: identityRefiner(),
    },
    {
      refine: (chunk, ctx) => {
        const type = decode(typeCoder, chunk.type, ctx);
        // Return refiner key if known, otherwise use UNKNOWN passthrough
        return (type === "IHDR" || type === "PLTE" || type === "tRNS" ||
            type === "bKGD" || type === "IDAT" || type === "IEND")
          ? type
          : "UNKNOWN";
      },
      unrefine: (chunk, _ctx) => {
        // For refined chunks, type is already a string
        const type = chunk.type as string;
        return (type === "IHDR" || type === "PLTE" || type === "tRNS" ||
            type === "bKGD" || type === "IDAT" || type === "IEND")
          ? type as
            | "IHDR"
            | "PLTE"
            | "tRNS"
            | "bKGD"
            | "IDAT"
            | "IEND"
            | "UNKNOWN"
          : "UNKNOWN";
      },
    },
  );

  return coder;
}

/**
 * Creates a coder for complete PNG files with automatic chunk refinement.
 *
 * This is the main entry point for working with PNG files. It creates a coder
 * that handles the PNG signature and automatically refines known chunk types
 * (IHDR, PLTE, tRNS, bKGD, IDAT, IEND) to their structured representations.
 *
 * @returns A coder for complete PNG files with refined chunk types.
 *
 * @example Decode a PNG file
 * ```ts
 * import { assert } from "@std/assert";
 * import { pngFile } from "@binstruct/png";
 *
 * const coder = pngFile();
 *
 * // The coder can encode and decode complete PNG files
 * assert(typeof coder.decode === "function");
 * assert(typeof coder.encode === "function");
 * ```
 */
export function pngFile(): Coder<
  PngFile<
    | PngChunkUnknown
    | IhdrChunk
    | PlteChunk
    | TrnsChunk
    | BkgdChunk
    | IdatChunk
    | IendChunk
  >
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
