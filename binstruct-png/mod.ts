import {
  arrayWhile,
  bytes,
  type Coder,
  ref,
  struct,
  u32be,
} from "@hertzg/binstruct";

/**
 * PNG file structure containing signature and chunks.
 */
export interface PngFile {
  signature: Uint8Array;
  chunks: PngChunk[];
}

/**
 * Generic PNG chunk structure.
 */
export interface PngChunk {
  length: number;
  type: Uint8Array;
  data: Uint8Array;
  crc: number;
}

/**
 * Creates a coder for PNG files.
 *
 * @returns A coder that encodes/decodes PNG files
 *
 * @example
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
 * const [decodedPng, bytesRead] = pngCoder.decode(
 *   buffer.subarray(0, bytesWritten),
 * );
 *
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(decodedPng.signature, testPng.signature);
 * assertEquals(decodedPng.chunks.length, testPng.chunks.length);
 * ```
 */
export function pngFile(): Coder<PngFile> {
  return struct({
    signature: bytes(8),
    chunks: arrayWhile(pngChunk(), ({ buffer }) => buffer.length >= 12),
  });
}

/**
 * Creates a coder for PNG chunks.
 *
 * @returns A coder that encodes/decodes PNG chunks
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pngChunk } from "@binstruct/png";
 *
 * const chunkCoder = pngChunk();
 * const testChunk: PngChunk = {
 *   length: 13,
 *   type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
 *   data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
 *   crc: 0x12345678,
 * };
 *
 * const buffer = new Uint8Array(32);
 * const bytesWritten = chunkCoder.encode(testChunk, buffer);
 * const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);
 *
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(decodedChunk.length, testChunk.length);
 * assertEquals(decodedChunk.type, testChunk.type);
 * assertEquals(decodedChunk.data, testChunk.data);
 * assertEquals(decodedChunk.crc, testChunk.crc);
 * ```
 */
export function pngChunk(): Coder<PngChunk> {
  const lengthCoder = u32be();
  return struct({
    length: lengthCoder,
    type: bytes(4),
    data: bytes(ref(lengthCoder)),
    crc: u32be(),
  });
}
