/**
 * Byte-slice coder for binary structures.
 *
 * Encodes/decodes raw bytes either as a fixed-length slice or as a variable-length
 * view that consumes all available bytes.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Fixed and variable length
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { bytes } from "@hertzg/binstruct/bytes";
 *
 * const fixed = bytes(4);
 * const variable = bytes();
 *
 * const input = new Uint8Array([1, 2, 3, 4, 5]);
 * const buf = new Uint8Array(32);
 *
 * const w1 = fixed.encode(input, buf);
 * const [d1] = fixed.decode(buf);
 * assertEquals(Array.from(d1), [1, 2, 3, 4]);
 *
 * const w2 = variable.encode(input, buf);
 * const [d2] = variable.decode(buf);
 * assertEquals(Array.from(d2.slice(0, input.length)), Array.from(input));
 * assertEquals(typeof w1, "number");
 * assertEquals(typeof w2, "number");
 * ```
 *
 * @module
 */
import { type Coder, createContext } from "./mod.ts";
import { isRef } from "./ref.ts";
import { isValidLength, type LengthType, tryUnrefLength } from "./length.ts";

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
 * assertEquals(Array.from(decoded), [1, 2, 3, 4]);
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
    encode: (value, target, context): number => {
      const ctx = context ?? createContext("encode");
      const len = tryUnrefLength(length, ctx) ?? value.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      // Add the length value to context so refs can resolve it
      if (length != null && typeof length === "object") {
        ctx.refs.set(length, len);
      }

      const toWrite = value.subarray(0, len);
      target.set(toWrite, 0);
      return len;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const len = tryUnrefLength(length, ctx);

      if (len != null) {
        // Fixed length case
        if (!isValidLength(len)) {
          throw new Error(
            `Invalid length: ${len}. Must be a non-negative integer.`,
          );
        }

        // Add the length value to context so refs can resolve it
        if (length != null && typeof length === "object") {
          ctx.refs.set(length, len);
        }

        if (encoded.length < len) {
          throw new Error(
            `Need ${len} bytes, got ${encoded.length}`,
          );
        }

        // For fixed length, only read the specified number of bytes
        const result = encoded.subarray(0, len);
        return [result, len];
      } else {
        // Variable length case - read all available bytes
        return [encoded, encoded.length];
      }
    },
  };
}
