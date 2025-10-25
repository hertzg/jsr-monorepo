import type { Coder, Context } from "./core.ts";
import { isRef, refGetValue, refSetValue, type RefValue } from "./ref/ref.ts";

/**
 * A type representing a length value that can be either a number or a reference to a number.
 */
export type LengthOrRef = number | RefValue<number>;

/**
 * Type guard to check if a value is a valid length or a reference to a length.
 *
 * This function determines whether a value can be used as a length parameter
 * in binary encoding/decoding operations. A valid length value can be either
 * a literal number or a reference that will be resolved during encoding/decoding.
 *
 * @param value - The value to check
 * @returns True if the value is a length or reference, false otherwise
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isLengthOrRef, ref, u16le } from "@hertzg/binstruct";
 *
 * // Check literal numbers
 * assertEquals(isLengthOrRef(0), true);
 * assertEquals(isLengthOrRef(100), true);
 * assertEquals(isLengthOrRef(1024), true);
 *
 * // Check references
 * const lengthRef = ref(u16le());
 * assertEquals(isLengthOrRef(lengthRef), true);
 *
 * // Check invalid values
 * assertEquals(isLengthOrRef("string"), false);
 * assertEquals(isLengthOrRef(null), false);
 * assertEquals(isLengthOrRef(undefined), false);
 * assertEquals(isLengthOrRef({}), false);
 * ```
 */
export function isLengthOrRef(value: unknown): value is LengthOrRef {
  return typeof value === "number" || isRef<number>(value);
}

/**
 * Validates if a length value is valid for binary encoding.
 *
 * A valid length must be a non-negative integer.
 *
 * @param length - The length value to validate
 * @returns True if the length is valid, false otherwise
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidLength } from "./length.ts";
 *
 * assertEquals(isValidLength(0), true);      // Valid: zero
 * assertEquals(isValidLength(100), true);    // Valid: positive integer
 * assertEquals(isValidLength(-1), false);    // Invalid: negative
 * assertEquals(isValidLength(3.14), false);  // Invalid: not integer
 * assertEquals(isValidLength(NaN), false);   // Invalid: NaN
 * ```
 */
export function isValidLength(length: number): boolean {
  return Number.isInteger(length) && length >= 0;
}

/**
 * Attempts to resolve a length value from a reference or literal.
 *
 * If the length is a reference, it will be resolved using the provided context.
 * If the length is a literal number, it will be returned as-is.
 * If no context is provided or the reference cannot be resolved, undefined is returned.
 *
 * This function is commonly used internally by array and bytes coders to resolve
 * length values that may be either literal numbers or references to other fields.
 *
 * @param ctx - The context for resolving references
 * @param lengthOrRef - The length value (can be a number or reference)
 * @returns The resolved length value, or undefined if resolution is not possible
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { lengthRefGet, ref, struct, u16le, array, u8le, encode, decode } from "@hertzg/binstruct";
 *
 * // Create a struct with a length field and array
 * const lengthCoder = u16le();
 * const dataCoder = struct({
 *   length: lengthCoder,
 *   data: array(u8le(), ref(lengthCoder)),
 * });
 *
 * const testData = {
 *   length: 3,
 *   data: [10, 20, 30],
 * };
 *
 * // Encode and decode the data
 * const buffer = new Uint8Array(100);
 * const encoded = encode(dataCoder, testData, undefined, buffer);
 * const decoded = decode(dataCoder, encoded);
 *
 * // Verify the length was properly referenced
 * assertEquals(decoded.length, 3);
 * assertEquals(decoded.data.length, 3);
 * ```
 */
export function lengthRefGet(
  ctx: Context | undefined | null,
  lengthOrRef: LengthOrRef,
): number | undefined {
  return refGetValue(ctx, lengthOrRef);
}

/**
 * Sets a length value in the context for the given coder.
 *
 * This function stores a length value in the encoding/decoding context,
 * making it available for resolution by references that use the same coder.
 * It's typically used during encoding/decoding operations to populate the
 * context with values that length references need to resolve.
 *
 * @param ctx - The context to set the length in
 * @param coder - The coder to set the length for
 * @param length - The length value to set
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { lengthRefSet, ref, struct, u16le, array, u8le, encode, decode } from "@hertzg/binstruct";
 *
 * // Create a struct with referenced length
 * const lengthCoder = u16le();
 * const dataCoder = struct({
 *   length: lengthCoder,
 *   data: array(u8le(), ref(lengthCoder)),
 * });
 *
 * const testData = {
 *   length: 5,
 *   data: [1, 2, 3, 4, 5],
 * };
 *
 * // Encode and decode - lengthRefSet is called internally
 * const buffer = new Uint8Array(100);
 * const encoded = encode(dataCoder, testData, undefined, buffer);
 * const decoded = decode(dataCoder, encoded);
 *
 * // Verify the length reference was properly set and used
 * assertEquals(decoded.data.length, decoded.length);
 * assertEquals(decoded.data.length, 5);
 * ```
 */
export function lengthRefSet(
  ctx: Context | null | undefined,
  coder: Coder<number>,
  length: number,
): void {
  refSetValue(ctx, coder, length);
}
