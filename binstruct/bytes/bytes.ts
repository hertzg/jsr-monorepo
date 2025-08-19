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
import { isValidLength, type LengthOrRef, lengthRefGet } from "../length.ts";
import { type Coder, createContext, kCoderKind } from "../core.ts";
import { isRef, refSetValue } from "../ref/ref.ts";

const kKindBytes = Symbol("bytes");

/**
 * Creates a Coder for byte slices.
 *
 * @param lengthOrRef - Optional fixed length. If not provided, consumes all available bytes
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
  lengthOrRef?: LengthOrRef | null,
): Coder<Uint8Array> {
  if (
    lengthOrRef != null &&
    !isRef<number>(lengthOrRef) &&
    !isValidLength(lengthOrRef)
  ) {
    throw new Error(
      `Invalid length: ${lengthOrRef}. Must be a reference to or a literal non-negative integer.`,
    );
  }

  let self: Coder<Uint8Array>;
  return self = {
    [kCoderKind]: kKindBytes,
    encode: (value, target, context): number => {
      const ctx = context ?? createContext("encode");
      const len = lengthOrRef == null
        ? value.length
        : lengthRefGet(ctx, lengthOrRef);

      if (len === undefined) {
        throw new Error("Invalid length: Unable to resolve length");
      }

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      refSetValue(ctx, self, value);

      const toWrite = value.subarray(0, len);
      target.set(toWrite, 0);
      return len;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");

      if (lengthOrRef == null) {
        refSetValue(ctx, self, encoded);
        return [encoded, encoded.length];
      }

      const len = lengthRefGet(ctx, lengthOrRef);
      if (len === undefined) {
        throw new Error("Invalid length: Unable to resolve length");
      }

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      if (encoded.length < len) {
        throw new Error(
          `Need ${len} bytes, got only ${encoded.length}`,
        );
      }

      const truncated = encoded.subarray(0, len);
      refSetValue(ctx, self, truncated);
      return [truncated, len];
    },
  };
}
