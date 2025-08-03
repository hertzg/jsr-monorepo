import {
  type Coder,
  isValidLength,
  LengthType,
  tryUnrefLength,
} from "./mod.ts";

/**
 * Creates a Coder for length-prefixed arrays of a given element type.
 *
 * The array is encoded with a length prefix followed by the elements.
 * The length is encoded using the provided lengthType coder.
 *
 * @param elementType - The coder for individual array elements
 * @param lengthType - The coder for the array length (typically u32 or u16)
 * @returns A Coder that can encode/decode arrays of the element type
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { arrayLP } from "@hertzg/binstruct/array";
 * import { u32be, u8be } from "@hertzg/binstruct/numeric";
 *
 * const numberArrayCoder = arrayLP(u8be(), u32be());
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = numberArrayCoder.encode([1, 2, 3, 4], buffer);
 * const [decoded, bytesRead] = numberArrayCoder.decode(buffer);
 * assertEquals(decoded, [1, 2, 3, 4]);
 * ```
 */
export function arrayLP<TDecoded>(
  elementType: Coder<TDecoded>,
  lengthType: Coder<number>,
): Coder<TDecoded[]> {
  return {
    encode: (decoded, target, context) => {
      let cursor = 0;
      cursor += lengthType.encode(
        decoded.length,
        target.subarray(cursor),
        context,
      );

      for (let i = 0; i < decoded.length; i++) {
        cursor += elementType.encode(
          decoded[i],
          target.subarray(cursor),
          context,
        );
      }
      return cursor;
    },
    decode: (encoded, context) => {
      let cursor = 0;
      const [length, bytesRead] = lengthType.decode(
        encoded.subarray(cursor),
        context,
      );
      cursor += bytesRead;

      const decoded = new Array<TDecoded>(length);
      for (let i = 0; i < length; i++) {
        const [element, bytesRead] = elementType.decode(
          encoded.subarray(cursor),
          context,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }

      return [decoded, cursor];
    },
  };
}

export function arrayFL<TDecoded>(
  elementType: Coder<TDecoded>,
  length: LengthType,
): Coder<TDecoded[]> {
  return {
    encode: (decoded, target, context) => {
      const len = tryUnrefLength(length, context) ?? decoded.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      if (len != decoded.length) {
        throw new Error(
          `Invalid length: ${len}. Must be equal to the decoded length.`,
        );
      }

      let cursor = 0;
      for (let i = 0; i < len; i++) {
        cursor += elementType.encode(
          decoded[i],
          target.subarray(cursor),
          context,
        );
      }

      return cursor;
    },
    decode: (encoded, context) => {
      const len = tryUnrefLength(length, context);

      if (len == null || !isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      const decoded = new Array<TDecoded>();
      let cursor = 0;
      for (let i = 0; i < len; i++) {
        const [element, bytesRead] = elementType.decode(
          encoded.subarray(cursor),
          context,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }
      return [decoded, cursor];
    },
  };
}
