import { type Coder, createContext, kCoderKind } from "../core.ts";
import { isValidLength, type LengthOrRef, lengthRefGet } from "../length.ts";

const kKindArrayFL = Symbol("arrayFL");

export function arrayFL<TDecoded>(
  elementType: Coder<TDecoded>,
  lengthOrRef: LengthOrRef,
): Coder<TDecoded[]> {
  return {
    [kCoderKind]: kKindArrayFL,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      const len = lengthRefGet(ctx, lengthOrRef) ?? decoded.length;

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
          ctx,
        );
      }

      return cursor;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const len = lengthRefGet(ctx, lengthOrRef);

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
          ctx,
        );
        cursor += bytesRead;
        decoded[i] = element;
      }
      return [decoded, cursor];
    },
  };
}
