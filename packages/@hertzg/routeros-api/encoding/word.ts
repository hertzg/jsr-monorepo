/**
 * MikroTik API word encoding
 *
 * A word consists of a length prefix followed by content bytes.
 * The length prefix uses the variable-length encoding from length.ts
 */

import { decodeLength, encodeLength } from "./length.ts";

/**
 * Encoded word as a Uint8Array
 *
 * Format: [length prefix (1-5 bytes)][UTF-8 content bytes]
 * The length prefix indicates the number of content bytes that follow.
 */
export type EncodedWord = Uint8Array;

/**
 * Decoded word value with metadata
 *
 * Contains the decoded string and the total number of bytes consumed
 * (including both the length prefix and content bytes).
 */
export type DecodedWord = {
  /** The decoded UTF-8 string */
  word: string;
  /** Total bytes read (length prefix + content) */
  bytesRead: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

/**
 * Encodes a word (string or bytes) into MikroTik API format
 *
 * Converts the input to UTF-8 bytes, prepends a variable-length size prefix,
 * and returns the complete encoded word ready for transmission.
 *
 * @param content - The string or byte array to encode
 * @returns Encoded word with length prefix and content bytes
 *
 * @example Encode a simple string
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeWord } from "@hertzg/routeros-api/encoding/word";
 *
 * const encoded = encodeWord("hello");
 * // First byte is length (5), followed by "hello" in UTF-8
 * assertEquals(encoded, new Uint8Array([0x05, 0x68, 0x65, 0x6C, 0x6C, 0x6F]));
 * ```
 *
 * @example Encode a command word
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeWord } from "@hertzg/routeros-api/encoding/word";
 *
 * const encoded = encodeWord("/interface/print");
 * assertEquals(encoded[0], 16); // Length byte
 * assertEquals(encoded.length, 17); // 1 byte length + 16 bytes content
 * ```
 *
 * @example Encode raw bytes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeWord } from "@hertzg/routeros-api/encoding/word";
 *
 * const bytes = new Uint8Array([0x41, 0x42, 0x43]);
 * const encoded = encodeWord(bytes);
 * assertEquals(encoded, new Uint8Array([0x03, 0x41, 0x42, 0x43]));
 * ```
 */
export function encodeWord(content: string | Uint8Array): EncodedWord {
  const bytes = typeof content === "string"
    ? textEncoder.encode(content)
    : content;

  const lengthBytes = encodeLength(bytes.length);
  const result = new Uint8Array(lengthBytes.length + bytes.length);
  result.set(lengthBytes, 0);
  result.set(bytes, lengthBytes.length);

  return result;
}

/**
 * Decodes a word from MikroTik API format
 *
 * Reads the variable-length size prefix, extracts the content bytes,
 * and decodes them as a UTF-8 string.
 *
 * @param bytes - The byte array containing the encoded word
 * @param options - Optional decoding options
 * @param options.offset - Byte offset to start reading from (default: 0)
 * @returns Object containing the decoded string and total bytes consumed
 *
 * @example Decode a simple word
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeWord } from "@hertzg/routeros-api/encoding/word";
 *
 * const buffer = new Uint8Array([0x05, 0x68, 0x65, 0x6C, 0x6C, 0x6F]);
 * const result = decodeWord(buffer);
 * assertEquals(result.word, "hello");
 * assertEquals(result.bytesRead, 6);
 * ```
 *
 * @example Decode with offset
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeWord } from "@hertzg/routeros-api/encoding/word";
 *
 * const buffer = new Uint8Array([0xFF, 0xFF, 0x03, 0x41, 0x42, 0x43]);
 * const result = decodeWord(buffer, { offset: 2 });
 * assertEquals(result.word, "ABC");
 * assertEquals(result.bytesRead, 4);
 * ```
 *
 * @example Round-trip encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeWord, decodeWord } from "@hertzg/routeros-api/encoding/word";
 *
 * const original = "/interface/print";
 * const encoded = encodeWord(original);
 * const decoded = decodeWord(encoded);
 *
 * assertEquals(decoded.word, original);
 * assertEquals(decoded.bytesRead, encoded.length);
 * ```
 */
export function decodeWord(
  bytes: Uint8Array,
  options?: { offset?: number },
): DecodedWord {
  const offset = options?.offset ?? 0;

  // Decode the length prefix
  const { length, bytesRead: lengthBytes } = decodeLength(bytes, { offset });

  // Check if we have enough bytes for the content
  if (offset + lengthBytes + length > bytes.length) {
    throw new RangeError(
      `Incomplete word: expected ${length} bytes, but only ${
        bytes.length - offset - lengthBytes
      } available`,
    );
  }

  // Extract the content
  const contentStart = offset + lengthBytes;
  const contentEnd = contentStart + length;
  const contentBytes = bytes.slice(contentStart, contentEnd);

  return {
    word: textDecoder.decode(contentBytes),
    bytesRead: lengthBytes + length,
  };
}
