/**
 * Package provides {@linkcode bx} and {@linkcode bxx} method thar accepts a string containing hex encoded data
 * and returns an ArrayBuffer or Buffer respectively.
 *
 * @example
 * ```ts
 * // Examples of cases when it returns an ArrayBuffer
 * const HEADER = bx('00 ff 00 ff'); // ArrayBuffer { [Uint8Contents]: <00 ff 00 ff>, byteLength: 4 }
 * const SYNC1 = bx('00ff00ff_b4_01020304'); // ArrayBuffer { [Uint8Contents]: <00 ff 00 ff b4 01 02 03 04>, byteLength: 9 }
 * const ZEROLENGTH = bx(''); // ArrayBuffer { [Uint8Contents]: <>, byteLength: 0 }
 * ```
 *
 * @example
 * ```ts ignore
 * // Examples of cases when it throws
 * const WRONGHEX = bx('z ff 00 00'); // throws TypeError
 * const MISSZERO = bx('f2-00_0_00'); // throws TypeError
 * const SPACES = bx('          '); // throws TypeError
 * ```
 * @module
 */
import { Buffer } from "node:buffer";

/**
 * A method that accepts a string containing hex encoded buffer.
 * The string will be stripped of any non-hexadecimal symbols (eg: `[^0-9-a-f]`) and
 * if the resulting string has even length then it's used as new Uint8Array(value).buffer
 * or otherwise throws a TypeError.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * // Using spaces to separate bytes
 * const HEADER = bx('00 ff 00 ff');
 * assertEquals(new Uint8Array(HEADER), new Uint8Array([0x00, 0xff, 0x00, 0xff]));
 * ```
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * // Using underscores, dashes and other symbols to separate bytes
 * const SYNC1 = bx('00ff00ff_b4_01020304');
 * assertEquals(new Uint8Array(SYNC1), new Uint8Array([0x00,0xff,0x00,0xff,0xb4,0x01,0x02,0x03,0x04]));
 * ```
 *
 * @example
 * ```ts
 * import { assertEquals, assertThrows } from "@std/assert";
 *
 * // Empty string will return an empty ArrayBuffer
 * const ZEROLENGTH = bx('');
 * assertEquals(ZEROLENGTH.byteLength, 0);
 *
 * // Only empty strings yield empty ArrayBuffer otherwise it throws
 * assertThrows(() => bx('          '), TypeError);
 * ```
 *
 * @example
 * ```ts
 * import { assertThrows } from "@std/assert";
 * // Odd number of hex characters will throw a TypeError
 * assertThrows(() => bx('0 0 0'), TypeError);
 * ```
 *
 * @example
 * ```ts
 * import { assertThrows } from "@std/assert";
 * // Each byte must be represented by two characters
 * assertThrows(() => bx('f2-00_0_00'), TypeError);
 * ```
 *
 * @param hex The string containing hex encoded data
 * @returns An {@linkcode ArrayBuffer} containing that data.
 */
export function bx(hex: string): ArrayBuffer {
  if (hex === "") {
    return new ArrayBuffer(0);
  }

  const cleanHex = hex.replace(/[^0-9a-f]/g, "");

  if (cleanHex.length === 0 || cleanHex.length % 2 !== 0) {
    throw new TypeError(
      "hex string must yield non zero positive even number of characters",
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const data = cleanHex.match(/../g)!.map((hex) => parseInt(hex, 16));

  return new Uint8Array(data).buffer;
}

/**
 * Returns NodeJS Buffer for the given hex string otherwise exactly the same as {@linkcode bx}.
 * For examples see {@linkcode bx} documentation.
 *
 * @param hex The string containing hex encoded data
 * @returns A Buffer containing that data.
 */
export function bxx(hex: string): Buffer {
  return Buffer.from(bx(hex));
}
