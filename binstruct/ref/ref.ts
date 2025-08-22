/**
 * Reference system for binary data encoding and decoding.
 *
 * This module provides a reference system that allows for self-referential and
 * circular data structures by deferring the resolution of values until encoding/decoding
 * time. It includes:
 *
 * - **Basic References**: Defer value resolution using coders as keys
 * - **Computed References**: Dynamic calculations based on multiple references
 * - **Context Integration**: Seamless integration with the encoding/decoding context
 * - **Type Safety**: Full TypeScript support with proper type inference
 * - **Circular Structure Support**: Handle self-referential data structures
 *
 * References are essential for complex binary formats where field lengths
 * depend on other fields or where circular references are needed.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ref, computedRef, struct, u16le, u8, array } from "@hertzg/binstruct";
 *
 * // Create references for shared lengths
 * const channelsLength = u16le();
 * const pointsLength = u16le();
 *
 * // Define a structure with shared length references
 * const coder = struct({
 *   channelsLength: channelsLength,
 *   channels: struct({
 *     r: array(u8(), ref(channelsLength)),
 *     g: array(u8(), ref(channelsLength)),
 *     b: array(u8(), ref(channelsLength)),
 *   }),
 *   pointsLength: pointsLength,
 *   points: array(u16le(), ref(pointsLength)),
 * });
 *
 * // Test data
 * const testData = {
 *   channelsLength: 3,
 *   channels: {
 *     r: [255, 128, 64],
 *     g: [0, 255, 128],
 *     b: [0, 0, 255],
 *   },
 *   pointsLength: 2,
 *   points: [100, 200],
 * };
 *
 * // Encode and decode
 * const buffer = new Uint8Array(1000);
 * const bytesWritten = coder.encode(testData, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * // Verify the data
 * assertEquals(decoded.channelsLength, testData.channelsLength);
 * assertEquals(decoded.channels.r, testData.channels.r);
 * assertEquals(decoded.channels.g, testData.channels.g);
 * assertEquals(decoded.channels.b, testData.channels.b);
 * assertEquals(decoded.pointsLength, testData.pointsLength);
 * assertEquals(decoded.points, testData.points);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @module
 */

import type { Coder, Context } from "../core.ts";
import { kCtxRefs } from "../core.ts";

const kIsRefValue = Symbol("isRef");

/**
 * A weak map interface for storing references in the encoding/decoding context.
 *
 * This interface extends WeakMap to provide type-safe access to stored reference values
 * using coders as keys. It ensures that the correct types are retrieved when accessing
 * stored references.
 *
 * @template T - The type of the stored value
 */
export interface RefsWeakMap extends WeakMap<Coder<unknown>, unknown> {
  /**
   * Gets a reference value for the given coder.
   * @param coder - The coder to look up
   * @returns The stored value or undefined if not found
   */
  get<T>(coder: Coder<T>): T | undefined;
  /**
   * Sets a reference value for the given coder.
   * @param coder - The coder to store the value for
   * @param value - The value to store
   * @returns This instance for chaining
   */
  set<T>(coder: Coder<T>, value: T): this;
  /**
   * Checks if a reference value exists for the given coder.
   * @param coder - The coder to check
   * @returns True if a value exists, false otherwise
   */
  has<T>(coder: Coder<T>): boolean;
}

/**
 * Ensures that a context has the necessary reference storage initialized.
 *
 * This function checks if the given context already has reference storage
 * and initializes it if not. It's typically called before encoding/decoding
 * operations that use references.
 *
 * @param ctx - The context to initialize with references
 * @returns The context with reference storage initialized
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { withRefsInContext } from "./ref.ts";
 * import { createContext } from "../core.ts";
 *
 * // Create a basic context
 * const ctx = createContext("encode");
 *
 * // Initialize it with reference support
 * const ctxWithRefs = withRefsInContext(ctx);
 *
 * // Verify the context now has reference storage
 * assertEquals(ctxWithRefs === ctx, true);
 * ```
 */
export function withRefsInContext(ctx: Context): Context {
  if (!isRefsInContext(ctx)) {
    ctx[kCtxRefs] = new WeakMap() as RefsWeakMap;
  }

  return ctx;
}

/**
 * A type representing a reference value that can be resolved during encoding/decoding.
 *
 * This type represents a function that takes a context and returns the resolved value.
 * References are used to defer value resolution until the encoding/decoding context
 * is available, enabling circular and self-referential data structures.
 *
 * @template TDecoded - The type of the decoded value
 */
export type RefValue<TDecoded> = {
  (ctx: Context): TDecoded;
  [kIsRefValue]: true;
};

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
 * import { isRef, ref, u16le } from "@hertzg/binstruct";
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
  return typeof value === "function" && kIsRefValue in value;
}

/**
 * Type guard to check if a context has reference storage initialized.
 *
 * This internal function checks if the given context has the necessary
 * reference storage structure for resolving references.
 *
 * @param ctx - The context to check
 * @returns True if the context has reference storage, false otherwise
 */
function isRefsInContext(ctx: Context | null | undefined): ctx is Context & {
  [kCtxRefs]: RefsWeakMap;
} {
  return ctx != null && kCtxRefs in ctx;
}

/**
 * Creates a reference value that can be resolved during encoding/decoding.
 *
 * References allow for self-referential or circular data structures by
 * deferring the resolution of a coder until the context is available.
 *
 * @param coder - The coder to reference
 * @returns A RefValue that can be resolved with a context
 *
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ref, struct, u16le, u8, u32le, array } from "@hertzg/binstruct";
 *
 * // Create the coders that will be referenced
 * const channelsLength = u16le();
 * const pointsLength = u16le();
 *
 * // Define a complex structure with shared length references
 * const coder = struct({
 *   channelsLength: channelsLength,
 *   channels: struct({
 *     r: array(u8(), ref(channelsLength)),
 *     g: array(u8(), ref(channelsLength)),
 *     b: array(u8(), ref(channelsLength)),
 *   }),
 *   pointsLength: pointsLength,
 *   points: array(u32le(), ref(pointsLength)),
 * });
 *
 * // Create sample data
 * const data = {
 *   channelsLength: 3,
 *   channels: {
 *     r: [255, 128, 64],
 *     g: [0, 255, 128],
 *     b: [0, 0, 255],
 *   },
 *   pointsLength: 2,
 *   points: [12345, 67890],
 * };
 *
 * // Encode the data with context
 * const buffer = new Uint8Array(1000);
 * const bytesWritten = coder.encode(data, buffer);
 *
 * // Decode the data with context
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * // Verify the data matches
 * assertEquals(decoded.channelsLength, data.channelsLength);
 * assertEquals(decoded.channels.r, data.channels.r);
 * assertEquals(decoded.channels.g, data.channels.g);
 * assertEquals(decoded.channels.b, data.channels.b);
 * assertEquals(decoded.pointsLength, data.pointsLength);
 * assertEquals(decoded.points, data.points);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function ref<TDecoded>(
  coder: Coder<TDecoded>,
): RefValue<TDecoded> {
  const unref: RefValue<TDecoded> = (ctx: Context | null | undefined) => {
    if (!isRefsInContext(ctx)) {
      throw new Error("Context initiatized without refs");
    }

    if (ctx[kCtxRefs].has(coder)) {
      return ctx[kCtxRefs].get(coder)!;
    }

    throw new Error("Ref not found in context");
  };

  unref[kIsRefValue] = true;

  return unref;
}

/**
 * Retrieves the value from a reference or returns the value directly if it's not a reference.
 *
 * This function is a utility that handles both reference values and literal values.
 * If the input is a reference, it attempts to resolve it using the provided context.
 * If the input is not a reference, it returns the value as-is.
 *
 * @param ctx - The context to use for resolving references
 * @param refOrValue - Either a reference value or a literal value
 * @returns The resolved value or the literal value, or undefined if the reference cannot be resolved
 */
export function refGetValue<T>(
  ctx: Context | null | undefined,
  refOrValue: RefValue<T> | NoInfer<T>,
): NoInfer<T> | undefined {
  if (isRef<T>(refOrValue)) {
    return isRefsInContext(ctx) ? refOrValue(ctx) : undefined;
  }

  return refOrValue;
}

/**
 * Sets a value in the context for a specific coder reference.
 *
 * This function stores a value in the context's reference storage, making it
 * available for resolution by references that use the same coder. It's typically
 * used during encoding/decoding operations to populate the context with values
 * that references need to resolve.
 *
 * @param ctx - The context to store the value in
 * @param coder - The coder to associate with the value
 * @param value - The value to store
 */
export function refSetValue<T>(
  ctx: Context | null | undefined,
  coder: Coder<T>,
  value: T,
): void {
  if (isRefsInContext(ctx)) {
    ctx[kCtxRefs].set(coder, value);
  }
}

/**
 * Type utility to unwrap reference types from a tuple of references.
 *
 * This type extracts the decoded types from an array of references, making it
 * easier to work with computed references that depend on multiple other references.
 *
 * @template TTuple - A tuple of reference values
 */
export type UnwrapRefTuple<TTuple extends readonly RefValue<unknown>[]> = {
  [K in keyof TTuple]: TTuple[K] extends RefValue<infer TDecoded> ? TDecoded
    : never;
};

/**
 * Creates a computed reference that depends on multiple other references.
 *
 * Computed references allow you to create dynamic values that are calculated
 * from other references during encoding/decoding. This is useful for scenarios
 * where a value depends on multiple other values, such as calculating array
 * lengths, offsets, or derived values.
 *
 * @param refs - An array of references that the computation depends on
 * @param computation - A function that computes the final value from the resolved references
 * @returns A new reference that computes its value from the input references
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { computedRef, ref, struct, u16le, u8, array } from "@hertzg/binstruct";
 *
 * // Create the base references
 * const width = u16le();
 * const height = u16le();
 *
 * // Create a computed reference for total pixels
 * const totalPixels = computedRef(
 *   [ref(width), ref(height)],
 *   (w, h) => w * h
 * );
 *
 * // Define a structure using the computed reference
 * const coder = struct({
 *   width: width,
 *   height: height,
 *   pixels: array(u8(), totalPixels),
 * });
 *
 * // Test data
 * const data = {
 *   width: 3,
 *   height: 2,
 *   pixels: [255, 128, 64, 0, 255, 128],
 * };
 *
 * // Encode and decode
 * const buffer = new Uint8Array(1000);
 * const bytesWritten = coder.encode(data, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * // Verify the computed value
 * assertEquals(decoded.width, 3);
 * assertEquals(decoded.height, 2);
 * assertEquals(decoded.pixels.length, 6); // 3 * 2
 * assertEquals(decoded.pixels, data.pixels);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { computedRef, ref, struct, u16le, u32le, array } from "@hertzg/binstruct";
 *
 * // Create references for different counts
 * const headerCount = u16le();
 * const dataCount = u16le();
 *
 * // Create a computed reference for total count
 * const totalCount = computedRef(
 *   [ref(headerCount), ref(dataCount)],
 *   (header, data) => header + data
 * );
 *
 * // Define a structure with the computed reference
 * const coder = struct({
 *   headerCount: headerCount,
 *   dataCount: dataCount,
 *   headers: array(u32le(), ref(headerCount)),
 *   dataItems: array(u32le(), ref(dataCount)),
 * });
 *
 * // Test data
 * const data = {
 *   headerCount: 2,
 *   dataCount: 3,
 *   headers: [100, 200],
 *   dataItems: [300, 400, 500],
 * };
 *
 * // Encode and decode
 * const buffer = new Uint8Array(1000);
 * const bytesWritten = coder.encode(data, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * // Verify the computed total
 * assertEquals(decoded.headerCount, 2);
 * assertEquals(decoded.dataCount, 3);
 * assertEquals(decoded.headers.length, 2);
 * assertEquals(decoded.dataItems.length, 3);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function computedRef<
  const TArgs extends readonly RefValue<unknown>[],
  TDecoded,
>(
  refs: [...TArgs],
  computation: (...args: [...UnwrapRefTuple<TArgs>]) => TDecoded,
): RefValue<TDecoded> {
  const fn = (ctx: Context) => {
    const resolved = refs.map((r) => r(ctx)) as UnwrapRefTuple<TArgs>;
    return computation(...resolved);
  };

  fn[kIsRefValue] = true as const;
  return fn;
}
