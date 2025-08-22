import { type Coder, createContext, kCoderKind } from "../core.ts";
import { isValidLength, type LengthOrRef, lengthRefGet } from "../length.ts";
import { refSetValue } from "../ref/ref.ts";

/**
 * Symbol identifier for fixed-length string coders.
 */
export const kKindStringFL = Symbol("stringFL");

/**
 * Creates a Coder for fixed-length strings.
 *
 * The string is encoded as UTF-8 bytes with a fixed byte length.
 * The length can be a literal number or a reference that resolves during encoding/decoding.
 * If no length is provided, the string consumes all available bytes.
 *
 * @param byteLength - Optional fixed byte length (can be a number or reference)
 * @param decoderEncoding - Text encoding for decoding (default: "utf-8")
 * @param decoderOptions - Options for the TextDecoder
 * @returns A Coder that can encode/decode fixed-length strings
 */

export function stringFL(
  byteLength?: LengthOrRef,
  decoderEncoding: string = "utf-8",
  decoderOptions: TextDecoderOptions = {},
): Coder<string> {
  let self: Coder<string>;
  return self = {
    [kCoderKind]: kKindStringFL,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");

      let len: number;
      if (byteLength == null) {
        len = decoded.length;
      } else {
        len = lengthRefGet(ctx, byteLength) ?? decoded.length;
      }

      if (len != null && !isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      refSetValue(ctx, self, decoded);

      const truncated = target.subarray(0, len);
      const encoded = new TextEncoder().encodeInto(decoded, truncated);
      return encoded.written;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      const len = lengthRefGet(ctx, byteLength ?? encoded.length) ??
        encoded.length;

      if (!isValidLength(len)) {
        throw new Error(
          `Invalid length: ${len}. Must be a non-negative integer.`,
        );
      }

      const stringBytes = encoded.subarray(0, len ?? undefined);
      const decoded = new TextDecoder(decoderEncoding, {
        fatal: true,
        ignoreBOM: true,
        ...decoderOptions,
      }).decode(
        stringBytes,
      );

      refSetValue(ctx, self, decoded);

      return [decoded, stringBytes.length];
    },
  };
}
