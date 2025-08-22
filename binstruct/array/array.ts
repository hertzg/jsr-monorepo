/**
 * Array coders for binary structures.
 *
 * This module provides utilities for encoding and decoding arrays in two modes:
 * - Length-prefixed arrays using a numeric length coder
 * - Fixed-length arrays using a literal length or a {@link import("./ref.ts").RefValue}
 *
 * All coders follow the common {@link import("./mod.ts").Coder} interface.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Length-prefixed and fixed-length arrays
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { array, arrayLP, arrayFL } from "@hertzg/binstruct/array";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u8le, u16le } from "@hertzg/binstruct/numeric";
 *
 * // A structure mixing both array kinds
 * const coder = struct({
 *   lenPref: arrayLP(u8le(), u16le()), // [len:u16] followed by items
 *   fixed: arrayFL(u8le(), 3),         // exactly 3 items
 *   auto: array(u8le(), 2),            // auto-selects fixed-length
 *   while: array(u8le(), ({ index }) => index < 2), // while index < 2
 * });
 *
 * const value = { lenPref: [1, 2, 3], fixed: [4, 5, 6], auto: [7, 8], while: [9, 10] };
 * const buf = new Uint8Array(1024);
 * const written = coder.encode(value, buf);
 * const [decoded, read] = coder.decode(buf);
 *
 * assertEquals(decoded, value);
 * assertEquals(written, read);
 * ```
 *
 * @module
 */
import { type Coder, isCoder } from "../core.ts";
import { isLengthOrRef, type LengthOrRef } from "../length.ts";
import { arrayWhile, type ArrayWhileCondition } from "./conditional-while.ts";
import { arrayFL } from "./fixed-length.ts";
import { arrayLP } from "./length-prefixed.ts";

/**
 * Creates a Coder for arrays that automatically chooses between length-prefixed and fixed-length
 * based on the arguments provided.
 *
 * - If a lengthType coder is provided as the second argument, it creates a length-prefixed array
 * - If a length number/reference is provided as the second argument, it creates a fixed-length array
 *
 * @param elementType - The coder for individual array elements
 * @param condition - A condition function for while-loop arrays
 * @returns A Coder that can encode/decode arrays of the element type
 */
export function array<TDecoded>(
  elementType: Coder<TDecoded>,
  condition: ArrayWhileCondition<TDecoded>,
): Coder<TDecoded[]>;
/**
 * Creates a Coder for arrays that automatically chooses between length-prefixed and fixed-length
 * based on the arguments provided.
 *
 * - If a lengthType coder is provided as the second argument, it creates a length-prefixed array
 * - If a length number/reference is provided as the second argument, it creates a fixed-length array
 *
 * @param elementType - The coder for individual array elements
 * @param lengthCoderOrLengthType - Either a length coder (for length-prefixed) or length value/reference (for fixed-length)
 * @returns A Coder that can encode/decode arrays of the element type
 */
export function array<TDecoded>(
  elementType: Coder<TDecoded>,
  lengthCoderOrLengthType: Coder<number> | LengthOrRef,
): Coder<TDecoded[]>;
/**
 * Creates a Coder for arrays that automatically chooses between length-prefixed and fixed-length
 * based on the arguments provided.
 *
 * - If a lengthType coder is provided as the second argument, it creates a length-prefixed array
 * - If a length number/reference is provided as the second argument, it creates a fixed-length array
 *
 * @param elementType - The coder for individual array elements
 * @param lengthCoderOrLengthTypeOrCondition - Either a length coder, length value/reference, or condition function
 * @returns A Coder that can encode/decode arrays of the element type
 */
export function array<TDecoded>(
  elementType: Coder<TDecoded>,
  lengthCoderOrLengthTypeOrCondition:
    | Coder<number>
    | LengthOrRef
    | ArrayWhileCondition<TDecoded>,
): Coder<TDecoded[]> {
  if (isLengthOrRef(lengthCoderOrLengthTypeOrCondition)) {
    return arrayFL(elementType, lengthCoderOrLengthTypeOrCondition);
  }

  return isCoder<number>(lengthCoderOrLengthTypeOrCondition)
    ? arrayLP(elementType, lengthCoderOrLengthTypeOrCondition)
    : arrayWhile(elementType, lengthCoderOrLengthTypeOrCondition);
}

export { arrayFL, arrayLP, arrayWhile, type ArrayWhileCondition };
