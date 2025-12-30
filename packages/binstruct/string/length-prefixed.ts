import { type Coder, createContext, kCoderKind } from "../core.ts";
import { refSetValue } from "../ref/ref.ts";

/**
 * Symbol identifier for length-prefixed string coders.
 */
export const kKindStringLP = Symbol("stringLP");

/**
 * Creates a Coder for length-prefixed strings.
 *
 * The string is encoded with a length prefix followed by the string bytes.
 * The length is encoded using the provided lengthType coder.
 *
 * @param lengthType - The coder for the string length (typically u32 or u16)
 * @returns A Coder that can encode/decode length-prefixed strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringLP } from "@hertzg/binstruct/string";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Define a file metadata structure with length-prefixed strings
 * const fileMetadataCoder = struct({
 *   filename: stringLP(u16le()),    // Filename with 16-bit length prefix
 *   description: stringLP(u32le()), // Description with 32-bit length prefix
 *   author: stringLP(u16le()),      // Author name with 16-bit length prefix
 *   version: u16le(),               // Version number
 * });
 *
 * // Create sample file metadata
 * const metadata = {
 *   filename: "document.txt",
 *   description: "A sample text document with metadata",
 *   author: "John Doe",
 *   version: 1,
 * };
 *
 * const buffer = new Uint8Array(200);
 * const bytesWritten = fileMetadataCoder.encode(metadata, buffer);
 * const [decoded, bytesRead] = fileMetadataCoder.decode(buffer);
 * assertEquals(decoded, metadata);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */

export function stringLP(lengthType: Coder<number>): Coder<string> {
  let self: Coder<string>;
  return self = {
    [kCoderKind]: kKindStringLP,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      let cursor = 0;
      const stringBytes = new TextEncoder().encode(decoded);

      refSetValue(ctx, self, decoded);

      cursor += lengthType.encode(
        stringBytes.length,
        target.subarray(cursor),
        ctx,
      );
      target.set(stringBytes, cursor);
      cursor += stringBytes.length;
      return cursor;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      let cursor = 0;
      const [length, bytesRead] = lengthType.decode(
        encoded.subarray(cursor),
        ctx,
      );
      cursor += bytesRead;

      const stringBytes = encoded.subarray(cursor, cursor + length);
      const decoded = new TextDecoder().decode(stringBytes);
      refSetValue(ctx, self, decoded);
      cursor += length;

      return [decoded, cursor];
    },
  };
}
