import type { Coder, Context } from "./core.ts";
import { isRef, refGetValue, refSetValue, type RefValue } from "./ref/ref.ts";

/**
 * A type representing a length value that can be either a number or a reference to a number.
 */
export type LengthOrRef = number | RefValue<number>;

/**
 * Type guard to check if a value is a valid length or a reference to a length.
 *
 * This is an internal function used to validate length parameters in binary
 * encoding/decoding operations. A valid length value can be either a literal
 * number or a reference that will be resolved during encoding/decoding.
 *
 * @param value - The value to check
 * @returns True if the value is a length or reference, false otherwise
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
 * This is an internal function used by array and bytes coders to resolve length
 * values. If the length is a reference, it will be resolved using the provided
 * context. If the length is a literal number, it will be returned as-is.
 * If no context is provided or the reference cannot be resolved, undefined is returned.
 *
 * @param ctx - The context for resolving references
 * @param lengthOrRef - The length value (can be a number or reference)
 * @returns The resolved length value, or undefined if resolution is not possible
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
 * This is an internal function that stores a length value in the encoding/decoding
 * context, making it available for resolution by references that use the same coder.
 * It's used during encoding/decoding operations to populate the context with values
 * that length references need to resolve.
 *
 * @param ctx - The context to set the length in
 * @param coder - The coder to set the length for
 * @param length - The length value to set
 */
export function lengthRefSet(
  ctx: Context | null | undefined,
  coder: Coder<number>,
  length: number,
): void {
  refSetValue(ctx, coder, length);
}
