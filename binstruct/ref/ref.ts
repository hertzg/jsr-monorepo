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

export interface RefsWeakMap extends WeakMap<Coder<unknown>, unknown> {
  get<T>(coder: Coder<T>): T | undefined;
  set<T>(coder: Coder<T>, value: T): this;
  has<T>(coder: Coder<T>): boolean;
}

export function withRefsInContext(ctx: Context): Context {
  if (!isRefsInContext(ctx)) {
    ctx[kCtxRefs] = new WeakMap() as RefsWeakMap;
  }

  return ctx;
}

/**
 * A type representing a reference value that can be resolved during encoding/decoding.
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
 * import { ref, struct, u16le, u8, u32le, array, createContext } from "@hertzg/binstruct";
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

export function refGetValue<T>(
  ctx: Context | null | undefined,
  refOrValue: RefValue<T> | NoInfer<T>,
): NoInfer<T> | undefined {
  if (isRef<T>(refOrValue)) {
    return isRefsInContext(ctx) ? refOrValue(ctx) : undefined;
  }

  return refOrValue;
}

export function refSetValue<T>(
  ctx: Context | null | undefined,
  coder: Coder<T>,
  value: T,
): void {
  if (isRefsInContext(ctx)) {
    ctx[kCtxRefs].set(coder, value);
  }
}

type UnwrapRefTuple<TTuple extends readonly RefValue<unknown>[]> = {
  [K in keyof TTuple]: TTuple[K] extends RefValue<infer TDecoded> ? TDecoded
    : never;
};

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
