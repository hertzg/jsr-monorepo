/**
 * String coders for binary structures.
 *
 * This module provides utilities for encoding and decoding strings in three modes:
 * - Length-prefixed strings using a numeric length coder
 * - Null-terminated strings
 * - Fixed-length strings using a literal length or a {@link import("./ref.ts").RefValue}
 *
 * All coders follow the common {@link Coder} interface.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Using all string variants
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { string, stringLP, stringNT, stringFL } from "@hertzg/binstruct/string";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u8le, u16le } from "@hertzg/binstruct/numeric";
 *
 * const coder = struct({
 *   lp: stringLP(u16le()), // [len:u16] followed by UTF-8
 *   nt: stringNT(),        // UTF-8 bytes followed by 0x00
 *   fl: stringFL(5),       // exactly 5 bytes
 *   age: u8le(),
 * });
 *
 * const value = { lp: "alpha", nt: "beta", fl: "gamma", age: 42 };
 * const buf = new Uint8Array(256);
 * const written = coder.encode(value, buf);
 * const [decoded, read] = coder.decode(buf);
 *
 * assertEquals(decoded.lp, value.lp);
 * assertEquals(decoded.nt, value.nt);
 * assertEquals(decoded.fl, value.fl);
 * assertEquals(decoded.age, value.age);
 * assertEquals(written, read);
 * ```
 *
 * @module
 */
import type { LengthOrRef } from "../length.ts";
import { type Coder, isCoder } from "../core.ts";
import { stringLP } from "./length-prefixed.ts";
import { stringNT } from "./null-terminated.ts";
import { stringFL } from "./fixed-length.ts";

/**
 * Creates a Coder for strings that automatically chooses between length-prefixed,
 * null-terminated, and fixed-length based on the arguments provided.
 *
 * - If a lengthType coder is provided as the first argument, it creates a length-prefixed string
 * - If no arguments are provided, it creates a null-terminated string
 * - If a length value/reference is provided as the first argument, it creates a fixed-length string
 *
 * @param lengthOrLengthType - Optional length coder (for length-prefixed) or length value/reference (for fixed-length)
 * @param decoderEncoding - Text encoding for decoding (default: "utf-8", only used for fixed-length)
 * @param decoderOptions - Options for the TextDecoder (only used for fixed-length)
 * @returns A Coder that can encode/decode strings
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { string } from "@hertzg/binstruct/string";
 * import { u16le, u8le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Create a struct demonstrating length-prefixed and null-terminated strings
 * const personCoder = struct({
 *   name: string(u16le()),           // Length-prefixed string (uses u16le as length coder)
 *   bio: string(),                   // Null-terminated string (no arguments)
 *   age: u8le(),
 * });
 *
 * const person = {
 *   name: "John Doe",
 *   bio: "Software Developer",
 *   age: 30,
 * };
 *
 * const buffer = new Uint8Array(200);
 * const bytesWritten = personCoder.encode(person, buffer);
 * const [decoded, bytesRead] = personCoder.decode(buffer);
 * assertEquals(decoded.name, person.name);
 * assertEquals(decoded.age, person.age);
 * assertEquals(decoded.bio, person.bio);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function string(
  lengthOrLengthType?: Coder<number> | LengthOrRef | null,
  decoderEncoding: string = "utf-8",
  decoderOptions: TextDecoderOptions = {},
): Coder<string> {
  // If no arguments provided, create a null-terminated string
  if (lengthOrLengthType == null) {
    return stringNT();
  }

  return isCoder<number>(lengthOrLengthType)
    ? stringLP(lengthOrLengthType)
    : stringFL(lengthOrLengthType, decoderEncoding, decoderOptions);
}
