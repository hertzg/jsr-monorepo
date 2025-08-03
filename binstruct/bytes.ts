import type { Coder } from "./mod.ts";
import {
  isRef,
  isValidLength,
  type LengthType,
  tryUnrefLength,
} from "./ref.ts";

/**
 * Creates a Coder for byte slices.
 *
 * @param length - Optional fixed length. If not provided, consumes all available bytes
 * @returns A Coder for byte slices
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bytes } from "@hertzg/binstruct/bytes";
 *
 * // Fixed length - truncates to 4 bytes
 * const fixed = bytes(4);
 * const data = new Uint8Array([1, 2, 3, 4, 5]);
 * const buffer = new Uint8Array(100);
 * const written = fixed.encode(data, buffer);
 * const [decoded] = fixed.decode(buffer);
 * assertEquals(decoded, new Uint8Array([1, 2, 3, 4]));
 *
 * // Variable length - consumes all bytes
 * const variable = bytes();
 * const varData = new Uint8Array([1, 2, 3]);
 * const varWritten = variable.encode(varData, buffer);
 * const [varDecoded] = variable.decode(buffer);
 * assertEquals(varDecoded.slice(0, 3), varData);
 * ```
 */

export function bytes(
  length?: LengthType,
): Coder<Uint8Array> {
  if (
    length != null &&
    !isRef<number>(length) &&
    !isValidLength(length)
  ) {
    throw new Error(
      `Invalid length: ${length}. Must be a reference to or a literal non-negative integer.`,
    );
  }

  return {
    encode: (value, target, ctx): number => {
      const len = tryUnrefLength(length, ctx) ?? value.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      const toWrite = value.subarray(0, len);
      target.set(toWrite, 0);
      return len;
    },
    decode: (encoded, ctx) => {
      const len = tryUnrefLength(length, ctx) ?? encoded.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      if (encoded.length < len) {
        throw new Error(
          `Need ${len} bytes, got ${encoded.length}`,
        );
      }

      // For fixed length, only read the specified number of bytes
      const result = encoded.subarray(0, len);
      return [result, len];
    },
  };
}
