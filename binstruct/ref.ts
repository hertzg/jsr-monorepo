import type { Coder, Context } from "./mod.ts";

const kRefSymbol = Symbol("ref");

export type LengthType = number | RefValue<number>;

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
 * import { isValidLength } from "@hertzg/binstruct/ref";
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
 * @param length - The length value (can be a number, reference, or null/undefined)
 * @param ctx - The context for resolving references
 * @returns The resolved length value, or the original value if no resolution is possible
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { tryUnrefLength } from "@hertzg/binstruct/ref";
 *
 * // Literal value (no resolution needed)
 * const literal = tryUnrefLength(5, null);
 * assertEquals(literal, 5);
 *
 * // Null/undefined values
 * const nullValue = tryUnrefLength(null, null);
 * assertEquals(nullValue, null);
 *
 * const undefinedValue = tryUnrefLength(undefined, null);
 * assertEquals(undefinedValue, undefined);
 * ```
 */
export function tryUnrefLength(
  length: LengthType | undefined | null,
  ctx: Context | undefined | null,
): number | undefined | null {
  if (ctx != null) {
    return isRef<number>(length) ? length(ctx) : length;
  }

  return length as number | undefined | null;
}

export type RefValue<TDecoded> = {
  (ctx: Context): TDecoded;
  [kRefSymbol]: true;
};

/**
 * Creates a reference value that can be resolved during encoding/decoding.
 *
 * References allow for self-referential or circular data structures by
 * deferring the resolution of a coder until the context is available.
 *
 * @param coder - The coder to reference
 * @returns A RefValue that can be resolved with a context
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ref } from "@hertzg/binstruct/ref";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u32le, u16le } from "@hertzg/binstruct/numeric";
 * import { stringLP } from "@hertzg/binstruct/string";
 *
 * // Define a simple structure with a reference field
 * const itemCoder = struct({
 *   id: u32le(),                    // Item identifier
 *   name: stringLP(u16le()),        // Item name
 *   parentId: u32le(),              // Reference to parent item ID
 * });
 *
 * // Create sample item data
 * const item = {
 *   id: 1,
 *   name: "Root Item",
 *   parentId: 0, // No parent
 * };
 *
 * const buffer = new Uint8Array(100);
 * const bytesWritten = itemCoder.encode(item, buffer);
 * const [decoded, bytesRead] = itemCoder.decode(buffer);
 * assertEquals(decoded.id, item.id);
 * assertEquals(decoded.name, item.name);
 * assertEquals(decoded.parentId, item.parentId);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function ref<TDecoded>(coder: Coder<TDecoded>): RefValue<TDecoded> {
  const unref: RefValue<TDecoded> = (ctx: Context) => {
    if (!ctx.refs.has(coder as Coder<unknown>)) {
      throw new Error("Ref not found");
    }

    return ctx.refs.get(coder as Coder<unknown>)! as TDecoded;
  };

  unref[kRefSymbol] = true;
  return unref;
}

/**
 * Checks if a value is a reference created by the ref function.
 *
 * This function is used to distinguish between literal values and references
 * during encoding/decoding operations.
 *
 * @param value - The value to check
 * @returns True if the value is a reference, false otherwise
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isRef, ref } from "@hertzg/binstruct/ref";
 * import { u16le } from "@hertzg/binstruct/numeric";
 *
 * // Create a reference
 * const lengthRef = ref(u16le());
 * assertEquals(isRef(lengthRef), true);
 *
 * // Check literal values
 * assertEquals(isRef(5), false);
 * assertEquals(isRef("string"), false);
 * assertEquals(isRef(null), false);
 * assertEquals(isRef(undefined), false);
 * ```
 */
export function isRef<T>(value: unknown): value is RefValue<T> {
  return typeof value === "function" && kRefSymbol in value;
}
