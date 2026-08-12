import {
  type Coder,
  type Context,
  createContext,
  kCoderKind,
} from "../core.ts";
import { isValidLength, type LengthOrRef, lengthRefGet } from "../length.ts";
import { refSetValue } from "../ref/ref.ts";

/**
 * Symbol identifier for fixed-length string coders.
 */
export const kKindStringFL = Symbol("stringFL");

/**
 * Creates a Coder for fixed-length strings.
 *
 * The string is encoded as UTF-8 bytes with a fixed byte length.
 * The length can be a literal number or a reference that resolves during encoding/decoding.
 * If the encoded string is shorter than the specified length, only the written bytes
 * are counted. If longer, it will be truncated to fit.
 *
 * @param byteLength - Optional fixed byte length (can be a number or reference). If not provided, consumes all available bytes
 * @param decoderEncoding - Text encoding for decoding (default: "utf-8")
 * @param decoderOptions - Options for the TextDecoder
 * @returns A Coder that can encode/decode fixed-length strings
 *
 * @example Fixed-length strings with literal byte length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringFL } from "@hertzg/binstruct/string";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u32le } from "@hertzg/binstruct/numeric";
 *
 * // Define a file header with fixed-length fields
 * const fileHeaderCoder = struct({
 *   magic: stringFL(4),        // Exactly 4 bytes for magic number
 *   version: stringFL(5),      // Exactly 5 bytes for version string
 *   author: stringFL(8),       // Exactly 8 bytes for author name
 *   timestamp: u32le(),        // 4-byte timestamp
 * });
 *
 * const header = {
 *   magic: "BIN1",
 *   version: "1.0.0",
 *   author: "John Doe",
 *   timestamp: 1234567890,
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = fileHeaderCoder.encode(header, buffer);
 * const [decoded, bytesRead] = fileHeaderCoder.decode(buffer);
 *
 * assertEquals(decoded.magic, header.magic);
 * assertEquals(decoded.version, header.version);
 * assertEquals(decoded.author, header.author);
 * assertEquals(decoded.timestamp, header.timestamp);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example Fixed-length strings with referenced byte length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { stringFL } from "@hertzg/binstruct/string";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16le } from "@hertzg/binstruct/numeric";
 * import { ref } from "@hertzg/binstruct";
 *
 * // Define a structure where string length is specified by a field
 * const nameLength = u16le();
 * const recordCoder = struct({
 *   nameLength: nameLength,
 *   name: stringFL(ref(nameLength)),
 *   age: u16le(),
 * });
 *
 * const record = {
 *   nameLength: 8,
 *   name: "Jane Doe",
 *   age: 30,
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = recordCoder.encode(record, buffer);
 * const [decoded, bytesRead] = recordCoder.decode(buffer);
 *
 * assertEquals(decoded.name, record.name);
 * assertEquals(decoded.nameLength, 8);
 * assertEquals(decoded.age, record.age);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */

export function stringFL(
  byteLength?: LengthOrRef,
  decoderEncoding: string = "utf-8",
  decoderOptions: TextDecoderOptions = {},
): Coder<string> {
  const decoderInit: TextDecoderOptions = {
    fatal: true,
    ignoreBOM: true,
    ...decoderOptions,
  };
  const encoder = new TextEncoder();
  const decoder = new TextDecoder(decoderEncoding, decoderInit);

  const resolveLength = (ctx: Context, fallback: number): number => {
    const len = byteLength == null
      ? fallback
      : lengthRefGet(ctx, byteLength) ?? fallback;

    if (!isValidLength(len)) {
      throw new Error(
        `Invalid length: ${len}. Must be a non-negative integer.`,
      );
    }

    return len;
  };

  let self: Coder<string>;
  return self = {
    [kCoderKind]: kKindStringFL,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const len = resolveLength(ctx, decoded.length);

      refSetValue(ctx, self, decoded);

      const truncated = target.subarray(0, len);
      const encoded = encoder.encodeInto(decoded, truncated);
      return encoded.written;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const len = resolveLength(ctx, encoded.length);

      const stringBytes = encoded.subarray(0, len);
      const decoded = decoder.decode(stringBytes);

      refSetValue(ctx, self, decoded);

      return [decoded, stringBytes.length];
    },
  };
}
