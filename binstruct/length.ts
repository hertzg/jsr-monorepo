/**
 * Length helpers for binary structures.
 *
 * This module defines the {@link LengthType} union and helpers for validating and
 * resolving length values, including support for {@link import("./ref.ts").RefValue}.
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example Validating and resolving length values
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isValidLength, resolveLength, type LengthType } from "@hertzg/binstruct/length";
 * import { ref, refSetValue } from "@hertzg/binstruct/ref";
 * import { createContext } from "@hertzg/binstruct";
 * import { u16le } from "@hertzg/binstruct/numeric";
 *
 * const lenCoder = u16le();
 * const lenRef = ref(lenCoder);
 * const ctx = createContext("encode");
 * refSetValue(ctx, lenCoder, 5);
 *
 * const resolved = resolveLength(lenRef, ctx);
 * assertEquals(resolved, 5);
 * assertEquals(isValidLength(resolved!), true);
 * ```
 *
 * @module
 */
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
 * import { isValidLength } from "@hertzg/binstruct/length";
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
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolveLength } from "@hertzg/binstruct/length";
 *
 * // Literal value (no resolution needed)
 * const literal = resolveLength(5, null);
 * assertEquals(literal, 5);
 *
 * // Null/undefined values
 * const nullValue = resolveLength(null, null);
 * assertEquals(nullValue, null);
 *
 * const undefinedValue = resolveLength(undefined, null);
 * assertEquals(undefinedValue, undefined);
 * ```
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
