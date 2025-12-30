/**
 * MikroTik API sentence encoding
 *
 * A sentence is a sequence of words terminated by a zero-length word.
 * Each word is length-prefixed, and the sentence ends with a length of 0.
 */

import { decodeWord, encodeWord } from "./word.ts";

/**
 * Encoded sentence as a Uint8Array
 *
 * Format: [word1][word2]...[wordN][0x00]
 * Each word is length-prefixed, and the sentence terminates with a zero byte.
 */
export type EncodedSentence = Uint8Array;

/**
 * Decoded sentence value with metadata
 *
 * Contains the array of decoded word strings and the total number of bytes
 * consumed from the buffer (including all words and the terminator).
 */
export type DecodedSentence = {
  /** Array of decoded word strings */
  words: string[];
  /** Total bytes read (all words + terminator) */
  bytesRead: number;
};

/**
 * Encodes a sentence (array of strings) into MikroTik API format
 *
 * Each word is encoded with its length prefix, and a zero byte (0x00) is
 * appended to mark the end of the sentence.
 *
 * @param words - Array of strings to encode as a sentence
 * @returns Encoded sentence with all words and zero terminator
 *
 * @example Encode a simple command sentence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeSentence } from "@hertzg/routeros-api/encoding/sentence";
 *
 * const encoded = encodeSentence(["/interface/print"]);
 * // Should end with zero terminator
 * assertEquals(encoded[encoded.length - 1], 0x00);
 * ```
 *
 * @example Encode a command with attributes
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeSentence } from "@hertzg/routeros-api/encoding/sentence";
 *
 * const words = ["/interface/set", "=.id=ether1", "=disabled=yes"];
 * const encoded = encodeSentence(words);
 * assertEquals(encoded[encoded.length - 1], 0x00);
 * ```
 *
 * @example Encode empty sentence
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeSentence } from "@hertzg/routeros-api/encoding/sentence";
 *
 * const encoded = encodeSentence([]);
 * // Empty sentence is just the terminator
 * assertEquals(encoded, new Uint8Array([0x00]));
 * ```
 */
export function encodeSentence(words: string[]): EncodedSentence {
  // Encode each word
  const encodedWords = words.map((word) => encodeWord(word));

  // Calculate total length
  const totalLength = encodedWords.reduce((sum, w) => sum + w.length, 0) + 1; // +1 for terminator

  // Allocate buffer
  const result = new Uint8Array(totalLength);

  // Copy all encoded words
  let offset = 0;
  for (const encodedWord of encodedWords) {
    result.set(encodedWord, offset);
    offset += encodedWord.length;
  }

  // Add zero-length terminator
  result[offset] = 0x00;

  return result;
}

/**
 * Decodes a sentence from MikroTik API format
 *
 * Reads words sequentially until encountering a zero byte (0x00) terminator.
 * Each word is decoded with its length prefix.
 *
 * @param bytes - The byte array containing the encoded sentence
 * @param options - Optional decoding options
 * @param options.offset - Byte offset to start reading from (default: 0)
 * @returns Object containing the array of words and total bytes consumed
 *
 * @example Decode a simple command
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeSentence } from "@hertzg/routeros-api/encoding/sentence";
 *
 * // Sentence: "/login" (length 6) + terminator
 * const buffer = new Uint8Array([0x06, 0x2F, 0x6C, 0x6F, 0x67, 0x69, 0x6E, 0x00]);
 * const result = decodeSentence(buffer);
 * assertEquals(result.words, ["/login"]);
 * assertEquals(result.bytesRead, 8);
 * ```
 *
 * @example Decode with offset
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeSentence } from "@hertzg/routeros-api/encoding/sentence";
 *
 * const buffer = new Uint8Array([0xFF, 0xFF, 0x03, 0x66, 0x6F, 0x6F, 0x00]);
 * const result = decodeSentence(buffer, { offset: 2 });
 * assertEquals(result.words, ["foo"]);
 * assertEquals(result.bytesRead, 5);
 * ```
 *
 * @example Round-trip encoding and decoding
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeSentence, decodeSentence } from "@hertzg/routeros-api/encoding/sentence";
 *
 * const original = ["/interface/print", "=.proplist=name"];
 * const encoded = encodeSentence(original);
 * const decoded = decodeSentence(encoded);
 *
 * assertEquals(decoded.words, original);
 * assertEquals(decoded.bytesRead, encoded.length);
 * ```
 */
export function decodeSentence(
  bytes: Uint8Array,
  options?: { offset?: number },
): DecodedSentence {
  const offset = options?.offset ?? 0;
  const words: string[] = [];
  let currentOffset = offset;

  while (currentOffset < bytes.length) {
    // Check for zero-length terminator
    if (bytes[currentOffset] === 0x00) {
      return {
        words,
        bytesRead: currentOffset - offset + 1, // +1 for the terminator
      };
    }

    // Decode the next word
    const { word, bytesRead } = decodeWord(bytes, { offset: currentOffset });
    words.push(word);
    currentOffset += bytesRead;
  }

  throw new RangeError("Incomplete sentence: missing zero-length terminator");
}
