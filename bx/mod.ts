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
 * // Using spaces to separate bytes
 * const HEADER = bx('00 ff 00 ff'); // ArrayBuffer { [Uint8Contents]: <00 ff 00 ff>, byteLength: 4 }
 * ```
 *
 * @example
 * ```ts
 * // Using underscores, dashes and other symbols to separate bytes
 * const SYNC1 = bx('00ff00ff_b4_01020304'); // ArrayBuffer { [Uint8Contents]: <00 ff 00 ff b4 01 02 03 04>, byteLength: 9 }
 * ```
 *
 * @example
 * ```ts ignore
 * // Empty string will return an empty ArrayBuffer
 * const ZEROLENGTH = bx(''); // ArrayBuffer { [Uint8Contents]: <>, byteLength: 0 }
 *
 * // Only empty strings yield empty ArrayBuffer otherwise it throws
 * const SPACES_THROWS = bx('          '); // throws TypeError
 * ```
 *
 * @example
 * ```ts ignore
 * // Invalid hex strings will throw a TypeError
 * const WRONGHEX = bx('z ff 00 00'); // throws TypeError
 * ```
 *
 * @example
 * ```ts ignore
 * // Each byte must be represented by two characters
 * const MISSZERO = bx('f2-00_0_00'); // throws TypeError
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
