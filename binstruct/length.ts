import type { Coder, Context } from "./core.ts";
import { isRef, refGetValue, refSetValue, type RefValue } from "./ref/ref.ts";

/**
 * A type representing a length value that can be either a number or a reference to a number.
 */
export type LengthOrRef = number | RefValue<number>;

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
 * If no context is provided, the length is returned unchanged.
 *
 * @param lengthOrRef - The length value (can be a number, reference, or null/undefined)
 * @param ctx - The context for resolving references
 * @returns The resolved length value, or the original value if no resolution is possible
 */
export function lengthRefGet(
  ctx: Context | undefined | null,
  lengthOrRef: LengthOrRef,
): number | undefined {
  return refGetValue(ctx, lengthOrRef);
}

export function lengthRefSet(
  ctx: Context | null | undefined,
  coder: Coder<number>,
  length: number,
): void {
  refSetValue(ctx, coder, length);
}
