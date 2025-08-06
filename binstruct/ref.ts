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
