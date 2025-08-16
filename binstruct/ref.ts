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
 * import { ref, computedRef } from "./ref.ts";
 * import { struct } from "./struct.ts";
 * import { u16le, u8le } from "./numeric.ts";
 * import { arrayFL } from "./array.ts";
 *
 * // Create references for shared lengths
 * const channelsLength = u16le();
 * const pointsLength = u16le();
 *
 * // Define a structure with shared length references
 * const coder = struct({
 *   channelsLength: channelsLength,
 *   channels: struct({
 *     r: arrayFL(u8le(), ref(channelsLength)),
 *     g: arrayFL(u8le(), ref(channelsLength)),
 *     b: arrayFL(u8le(), ref(channelsLength)),
 *   }),
 *   pointsLength: pointsLength,
 *   points: arrayFL(u16le(), ref(pointsLength)),
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

import type { Coder, Context } from "./mod.ts";

const kRefSymbol = Symbol("ref");

/**
 * A type representing a reference value that can be resolved during encoding/decoding.
 */
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
 * It's the user's responsibility to provide a buffer big enough to fit the whole data.
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ref } from "@hertzg/binstruct/ref";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16le, u8, u32le } from "@hertzg/binstruct/numeric";
 * import { arrayFL } from "@hertzg/binstruct/array";
 * import { createContext } from "@hertzg/binstruct";
 *
 * // Create the coders that will be referenced
 * const channelsLength = u16le();
 * const pointsLength = u16le();
 *
 * // Define a complex structure with shared length references
 * const coder = struct({
 *   channelsLength: channelsLength,
 *   channels: struct({
 *     r: arrayFL(u8(), ref(channelsLength)),
 *     g: arrayFL(u8(), ref(channelsLength)),
 *     b: arrayFL(u8(), ref(channelsLength)),
 *   }),
 *   pointsLength: pointsLength,
 *   points: arrayFL(u32le(), ref(pointsLength)),
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

type UnwrapRefValue<T> = T extends RefValue<infer U> ? U : never;

/**
 * Creates a computed reference that can be resolved during encoding/decoding.
 *
 * Computed references allow for dynamic calculations based on multiple references
 * by deferring the computation until the context is available.
 *
 * @param computation - The function to compute the final value
 * @param refs - Array of references to resolve and pass to the computation function
 * @returns A RefValue that can be resolved with a context
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { computedRef, ref } from "@hertzg/binstruct/ref";
 * import { struct } from "@hertzg/binstruct/struct";
 * import { u16be, u8be } from "@hertzg/binstruct/numeric";
 * import { arrayFL } from "@hertzg/binstruct/array";
 * import { createContext } from "@hertzg/binstruct";
 *
 * // Create the coders that will be referenced
 * const width = u16be();
 * const height = u16be();
 *
 * // Define a structure with computed array length
 * const coder = struct({
 *   width: width,
 *   height: height,
 *   pixels: arrayFL(u8be(), computedRef((w: number, h: number) => w * h, [ref(width), ref(height)]))
 * });
 *
 * // Create sample data
 * const data = {
 *   width: 3,
 *   height: 2,
 *   pixels: [255, 128, 64, 0, 255, 128],
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
 * assertEquals(decoded.width, data.width);
 * assertEquals(decoded.height, data.height);
 * assertEquals(decoded.pixels, data.pixels);
 * assertEquals(bytesWritten, bytesRead);
 * ```
 */
export function computedRef<
  TRefs extends readonly RefValue<unknown>[],
  TDecoded,
>(
  computation: (
    ...args: { [K in keyof TRefs]: UnwrapRefValue<TRefs[K]> }
  ) => TDecoded,
  refs: TRefs,
): RefValue<TDecoded> {
  const computedRef: RefValue<TDecoded> = (ctx: Context) => {
    const resolvedRefs = refs.map((ref) => ref(ctx)) as {
      [K in keyof TRefs]: UnwrapRefValue<TRefs[K]>;
    };
    return computation(...resolvedRefs);
  };

  computedRef[kRefSymbol] = true;
  return computedRef;
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
