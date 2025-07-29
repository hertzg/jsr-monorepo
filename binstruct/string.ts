import type { Coder } from "./mod.ts";

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
 * import { assertEquals } from "jsr:@std/assert";
 * import { stringLP } from "@hertzg/binstruct/string";
 * import { u32be } from "@hertzg/binstruct/numeric";
 *
 * const stringCoder = stringLP(u32be);
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = stringCoder.encode("Hello, World!", buffer);
 * const [decoded, bytesRead] = stringCoder.decode(buffer);
 * assertEquals(decoded, "Hello, World!");
 * ```
 */
export function stringLP(lengthType: Coder<number>): Coder<string> {
  return {
    encode: (decoded, target) => {
      let cursor = 0;
      const stringBytes = new TextEncoder().encode(decoded);
      cursor += lengthType.encode(stringBytes.length, target.subarray(cursor));
      target.set(stringBytes, cursor);
      cursor += stringBytes.length;
      return cursor;
    },
    decode: (encoded) => {
      let cursor = 0;
      const [length, bytesRead] = lengthType.decode(encoded.subarray(cursor));
      cursor += bytesRead;

      const stringBytes = encoded.subarray(cursor, cursor + length);
      const decoded = new TextDecoder().decode(stringBytes);
      cursor += length;

      return [decoded, cursor];
    },
  };
}

/**
 * Creates a Coder for null-terminated strings.
 *
 * The string is encoded as UTF-8 bytes followed by a null byte (0x00).
 * Decoding reads until a null byte is encountered.
 *
 * @returns A Coder that can encode/decode null-terminated strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "jsr:@std/assert";
 * import { stringNT } from "@hertzg/binstruct/string";
 *
 * const stringCoder = stringNT();
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = stringCoder.encode("Hello, World!", buffer);
 * const [decoded, bytesRead] = stringCoder.decode(buffer);
 * assertEquals(decoded, "Hello, World!");
 * ```
 */
export function stringNT(): Coder<string> {
  return {
    encode: (decoded, target) => {
      const stringBytes = new TextEncoder().encode(decoded);
      target.set(stringBytes, 0);
      target[stringBytes.length] = 0; // null terminator
      return stringBytes.length + 1;
    },
    decode: (encoded) => {
      let cursor = 0;
      while (cursor < encoded.length && encoded[cursor] !== 0) {
        cursor++;
      }

      const stringBytes = encoded.subarray(0, cursor);
      const decoded = new TextDecoder().decode(stringBytes);

      // Include the null terminator in bytes read
      return [decoded, cursor + 1];
    },
  };
}
