/**
 * This module provides a refinement system for binary structure coders.
 * It allows you to transform decoded values into refined types and vice versa
 * during encoding/decoding operations.
 *
 * @example
 * ```typescript
 * import { assertEquals } from "@std/assert";
 * import { u8, refine } from "@hertzg/binstruct";
 *
 * const bitfield = refine(u8(), {
 *   refine: (unrefined: number) =>
 *     unrefined.toString(2)
 *       .padStart(8, "0")
 *       .split("")
 *       .map(Number),
 *   unrefine: (refined) => parseInt(refined.join(""), 2),
 * });
 *
 * const coder = bitfield();
 * const buffer = new Uint8Array(10);
 *
 * const bytesWritten = coder.encode([1, 0, 1, 0, 1, 0, 1, 0], buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 1);
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(buffer[0], 0b10101010);
 * assertEquals(decoded, [1, 0, 1, 0, 1, 0, 1, 0]);
 * ```
 *
 * @example
 * ```typescript
 * import { assertEquals } from "@std/assert";
 * import { u8, refine } from "@hertzg/binstruct";
 * import type { Context } from "@hertzg/binstruct";
 *
 * const u8Mapped = refine(u8(), {
 *   refine: (unrefined, _context, min: number, max: number) : number =>
 *     (min + (max - min) * unrefined / 0xff) >>> 0,
 *   unrefine: (refined, _context, min: number, max: number) => ((refined - min) / (max - min) * 0xff) >>> 0,
 * });
 *
 * const coder = u8Mapped(-100, 100);
 * const buffer = new Uint8Array(100);
 *
 * const bytesWritten = coder.encode(0, buffer);
 * const [decoded, bytesRead] = coder.decode(buffer);
 *
 * assertEquals(bytesWritten, 1);
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(buffer[0], 0x7f);
 * assertEquals(decoded, 0);
 * ```
 *
 * @module
 */

import {
  type Coder,
  type Context,
  createContext,
  kCoderKind,
} from "../core.ts";
import { refSetValue } from "../ref/ref.ts";

const kKindRefine = Symbol("refine");

/**
 * A refiner that transforms decoded values into refined types and vice versa.
 *
 * @template TUnrefined - The original decoded type from the base coder
 * @template TRefined - The refined type after transformation
 * @template TArgs - Additional arguments passed to the refiner functions
 *
 * @example
 * ```typescript
 * import { assertEquals } from "@std/assert";
 * import type { Context } from "@hertzg/binstruct";
 * import { createContext } from "@hertzg/binstruct";
 *
 * const booleanRefiner: Refiner<number, boolean, []> = {
 *   refine: (unrefined: number, _context: Context) => unrefined !== 0,
 *   unrefine: (refined: boolean, _context: Context) => refined ? 1 : 0,
 * };
 *
 * const ctx = createContext("decode");
 * assertEquals(booleanRefiner.refine(1, ctx), true);
 * assertEquals(booleanRefiner.refine(0, ctx), false);
 * assertEquals(booleanRefiner.unrefine(true, ctx), 1);
 * assertEquals(booleanRefiner.unrefine(false, ctx), 0);
 * ```
 */
export type Refiner<TUnrefined, TRefined, TArgs extends unknown[] = []> = {
  /**
   * Transforms a decoded value into a refined value.
   *
   * @param unrefined - The value decoded by the base coder
   * @param args - Additional arguments for the transformation
   * @returns The refined value
   */
  refine: (
    unrefined: TUnrefined,
    context: Context,
    ...args: TArgs
  ) => TRefined;

  /**
   * Transforms a refined value back to the original decoded format.
   *
   * @param refined - The refined value to transform back
   * @param args - Additional arguments for the transformation
   * @returns The value in the format expected by the base coder
   */
  unrefine: (
    refined: TRefined,
    context: Context,
    ...args: TArgs
  ) => TUnrefined;
};

/**
 * Creates a refined coder that applies transformations during encoding and decoding.
 *
 * This function takes a base coder and a refiner, then returns a function that
 * creates refined coders. The returned function accepts arguments that are passed
 * to the refiner's encode and decode methods.
 *
 * @template TUnrefined - The original decoded type from the base coder
 * @template TArgs - Additional arguments for the refiner
 * @template TRefined - The refined type after transformation
 *
 * @param coder - The base coder to refine
 * @param refiner - The refiner that defines the transformation logic
 * @returns A function that creates refined coders with the specified arguments
 *
 * @example
 * ```typescript
 * import { assertEquals } from "@std/assert";
 * import { string, refine } from "@hertzg/binstruct";
 *
 * // Create a refiner for date encoding/decoding
 * const isoDateString = refine(string(), {
 *   refine: (unrefined: string) => new Date(unrefined),
 *   unrefine: (refined: Date) => refined.toISOString(),
 * });
 *
 * // Create a date coder that works with Unix timestamps
 * const dateCoder = isoDateString();
 *
 * const testDate = new Date("2025-08-22T00:00:00Z");
 * const buffer = new Uint8Array(100);
 *
 * const bytesWritten = dateCoder.encode(testDate, buffer);
 * const [decodedDate, bytesRead] = dateCoder.decode(buffer);
 *
 * assertEquals(bytesRead, bytesWritten);
 * assertEquals(decodedDate.getTime(), testDate.getTime());
 * ```
 */
export function refine<
  TUnrefined,
  TRefined,
  const TArgs extends unknown[] = [],
>(
  coder: Coder<TUnrefined>,
  refiner: Refiner<TUnrefined, TRefined, TArgs>,
): (...args: TArgs) => Coder<TRefined> {
  return (...args: TArgs) => {
    let self: Coder<TRefined>;
    return self = {
      [kCoderKind]: kKindRefine,
      encode: (
        refined: TRefined,
        buffer: Uint8Array,
        context?: Context,
      ) => {
        const ctx = context ?? createContext("encode");
        refSetValue(ctx, self, refined);
        const bytesWritten = coder.encode(
          refiner.unrefine(refined, ctx, ...args),
          buffer,
          ctx,
        );
        return bytesWritten;
      },
      decode: (buffer: Uint8Array, context?: Context) => {
        const ctx = context ?? createContext("decode");
        const [decoded, bytesRead] = coder.decode(buffer, ctx);
        const refined = refiner.refine(decoded, ctx, ...args);
        refSetValue(ctx, self, refined);

        return [refined, bytesRead];
      },
    };
  };
}
