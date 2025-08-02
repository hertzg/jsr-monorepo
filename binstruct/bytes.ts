import type { Coder } from "./mod.ts";

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
export function bytes(length?: number): Coder<Uint8Array> {
  if (length === undefined) {
    return {
      encode: (value, target) => {
        target.set(value, 0);
        return value.length;
      },
      decode: (encoded) => [encoded.slice(), encoded.length],
    };
  }

  if (!Number.isInteger(length) || length < 0) {
    throw new Error(`Invalid length: ${length}. Must be non-negative integer.`);
  }

  return {
    encode: (value, target) => {
      const truncated = value.slice(0, length);
      target.set(truncated, 0);
      return length;
    },
    decode: (encoded) => {
      if (encoded.length < length) {
        throw new Error(`Need ${length} bytes, got ${encoded.length}`);
      }
      return [encoded.slice(0, length), length];
    },
  };
}
