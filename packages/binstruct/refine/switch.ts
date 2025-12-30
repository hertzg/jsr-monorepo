/**
 * Conditional refinement system using switch-like semantics for binary structure coders.
 *
 * This module provides a refineSwitch primitive that enables conditional multi-stage
 * bidirectional coding based on runtime values, similar to how switch statements work
 * in JavaScript/TypeScript.
 *
 * The refineSwitch primitive allows you to:
 * - Decode base values and conditionally apply different refiners based on runtime logic
 * - Encode refined values by selecting the appropriate refiner to reverse the transformation
 * - Compose multiple refiners in a type-safe, declarative manner
 * - Build discriminated unions where different values are refined differently
 *
 * @example Basic usage with discriminated union
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { refineSwitch, type Refiner, type Context } from "@hertzg/binstruct";
 * import { struct, u8, u32le, decode, encode, bytes } from "@hertzg/binstruct";
 *
 * // Base packet structure
 * interface Packet {
 *   type: number;
 *   data: Uint8Array;
 * }
 *
 * // Refined packet types
 * interface PingPacket {
 *   type: 1;
 *   timestamp: number;
 * }
 *
 * interface DataPacket {
 *   type: 2;
 *   value: number;
 * }
 *
 * // Define refiners for each packet type
 * const pingRefiner = (): Refiner<Packet, PingPacket, []> => ({
 *   refine: (packet, ctx) => ({
 *     type: 1,
 *     timestamp: decode(u32le(), packet.data, ctx),
 *   }),
 *   unrefine: (ping, ctx) => ({
 *     type: ping.type,
 *     data: encode(u32le(), ping.timestamp, ctx, new Uint8Array(4)),
 *   }),
 * });
 *
 * const dataRefiner = (): Refiner<Packet, DataPacket, []> => ({
 *   refine: (packet, ctx) => ({
 *     type: 2,
 *     value: decode(u8(), packet.data, ctx),
 *   }),
 *   unrefine: (data, ctx) => ({
 *     type: data.type,
 *     data: encode(u8(), data.value, ctx, new Uint8Array(1)),
 *   }),
 * });
 *
 * // Create base packet coder
 * const packetBase = struct({
 *   type: u8(),
 *   data: bytes(4),
 * });
 *
 * // Use refineSwitch to handle different packet types
 * const packetCoder = refineSwitch(
 *   packetBase,
 *   {
 *     ping: pingRefiner(),
 *     data: dataRefiner(),
 *   },
 *   {
 *     refine: (packet: Packet, _ctx: Context) => packet.type === 1 ? "ping" : "data",
 *     unrefine: (packet: PingPacket | DataPacket, _ctx: Context) => packet.type === 1 ? "ping" : "data",
 *   }
 * );
 *
 * // Test encoding and decoding
 * const buffer = new Uint8Array(10);
 * const ping: PingPacket = { type: 1, timestamp: 12345 };
 *
 * const written = packetCoder.encode(ping, buffer);
 * const [decoded] = packetCoder.decode(buffer);
 *
 * assertEquals(decoded.type, 1);
 * assertEquals((decoded as PingPacket).timestamp, 12345);
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
import type { Refiner } from "./refine.ts";
import { refSetValue } from "../ref/ref.ts";

const kKindRefineSwitch = Symbol("refineSwitch");

/**
 * Extracts the union of all refined types from a record of refiners.
 *
 * @template T - A record mapping keys to Refiner types
 *
 * @example
 * ```ts
 * import type { Refiner, RefinedUnion } from "@hertzg/binstruct";
 *
 * type Refiners = {
 *   a: Refiner<number, string, []>;
 *   b: Refiner<number, boolean, []>;
 * };
 *
 * type Result = RefinedUnion<Refiners>; // string | boolean
 * ```
 */
// deno-lint-ignore no-explicit-any
export type RefinedUnion<T extends Record<string, Refiner<any, any, any>>> = {
  // deno-lint-ignore no-explicit-any
  [K in keyof T]: T[K] extends Refiner<any, infer R, any> ? R : never;
}[keyof T];

/**
 * Creates a coder that conditionally applies refiners based on selector functions,
 * using switch-like semantics for bidirectional encoding and decoding.
 *
 * This primitive enables multi-stage conditional coding where different refiners
 * are applied based on runtime values. The selector functions determine which
 * refiner to use for both decode (refine) and encode (unrefine) operations.
 *
 * **Switch Statement Analogy:**
 * ```text
 * // Traditional switch
 * switch (getKey(value)) {
 *   case 'A': return refinerA(value);
 *   case 'B': return refinerB(value);
 *   default: throw new Error('No match');
 * }
 *
 * // refineSwitch equivalent
 * refineSwitch(baseCoder, refiners, {
 *   refine: (value) => getKey(value),    // switch expression for decode
 *   unrefine: (value) => getKey(value),  // switch expression for encode
 * })
 * ```
 *
 * **Discriminator Stability Contract:**
 * The selector must return the same key for a value before and after refinement.
 * Violating this contract will cause encoding to fail or produce incorrect results.
 *
 * Example violation:
 * ```text
 * refiner.refine({ type: "A", ... }) → { type: "B", ... } // INVALID - type changed
 * ```
 *
 * **Error Handling:**
 * If the selector returns `null`, an error is thrown. This fail-fast behavior
 * ensures type safety and prevents unexpected values from being processed.
 *
 * @template TBase - The base type decoded by the base coder
 * @template TRefiners - Record mapping selector keys to refiners
 *
 * @param baseCoder - The coder that decodes the base value
 * @param refiners - Record mapping keys to refiners that transform base values
 * @param selector - Functions that select which refiner to use based on value
 * @returns A coder that produces a union of all refined types
 *
 * @example PNG chunk refinement with type-based selection
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { refineSwitch, type Refiner, type Context, decode, encode } from "@hertzg/binstruct";
 * import { struct, u32be, bytes, string, ref } from "@hertzg/binstruct";
 *
 * interface PngChunkUnknown {
 *   length: number;
 *   type: Uint8Array;
 *   data: Uint8Array;
 *   crc: number;
 * }
 *
 * interface IhdrChunk {
 *   length: number;
 *   type: "IHDR";
 *   data: { width: number; height: number };
 *   crc: number;
 * }
 *
 * const lengthCoder = u32be();
 * const pngChunkUnknown = struct({
 *   length: lengthCoder,
 *   type: bytes(4),
 *   data: bytes(ref(lengthCoder)),
 *   crc: u32be(),
 * });
 *
 * const ihdrRefiner = (): Refiner<PngChunkUnknown, IhdrChunk, []> => {
 *   const typeCoder = string(4);
 *   const dataCoder = struct({ width: u32be(), height: u32be() });
 *
 *   return {
 *     refine: (chunk, ctx) => ({
 *       ...chunk,
 *       type: decode(typeCoder, chunk.type, ctx) as "IHDR",
 *       data: decode(dataCoder, chunk.data, ctx),
 *     }),
 *     unrefine: (chunk, ctx) => ({
 *       ...chunk,
 *       type: encode(typeCoder, chunk.type, ctx, new Uint8Array(4)),
 *       data: encode(dataCoder, chunk.data, ctx, new Uint8Array(8)),
 *     }),
 *   };
 * };
 *
 * const pngChunkCoder = refineSwitch(
 *   pngChunkUnknown,
 *   { IHDR: ihdrRefiner() },
 *   {
 *     refine: (chunk: PngChunkUnknown, ctx: Context) => {
 *       const type = decode(string(4), chunk.type, ctx);
 *       return type === "IHDR" ? "IHDR" : null;
 *     },
 *     unrefine: (chunk: IhdrChunk, _ctx: Context) => chunk.type === "IHDR" ? "IHDR" : null,
 *   }
 * );
 *
 * const buffer = new Uint8Array(100);
 * const chunk: IhdrChunk = {
 *   length: 8,
 *   type: "IHDR",
 *   data: { width: 100, height: 200 },
 *   crc: 0,
 * };
 *
 * const written = pngChunkCoder.encode(chunk, buffer);
 * const [decoded] = pngChunkCoder.decode(buffer);
 *
 * assertEquals((decoded as IhdrChunk).type, "IHDR");
 * assertEquals((decoded as IhdrChunk).data.width, 100);
 * ```
 *
 * @example Supporting unknown values with explicit fallback refiner
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { refineSwitch, type Refiner, type Context } from "@hertzg/binstruct";
 * import { struct, u8, bytes } from "@hertzg/binstruct";
 *
 * interface BaseMsg {
 *   type: number;
 *   data: Uint8Array;
 * }
 *
 * interface KnownMsg {
 *   type: 1;
 *   value: number;
 * }
 *
 * interface UnknownMsg {
 *   type: number;
 *   data: Uint8Array;
 * }
 *
 * const knownRefiner = (): Refiner<BaseMsg, KnownMsg, []> => ({
 *   refine: (msg, _ctx) => ({ type: 1, value: msg.data[0] }),
 *   unrefine: (msg, _ctx) => ({ type: 1, data: new Uint8Array([msg.value]) }),
 * });
 *
 * const unknownRefiner = (): Refiner<BaseMsg, UnknownMsg, []> => ({
 *   refine: (msg, _ctx) => msg,
 *   unrefine: (msg, _ctx) => msg,
 * });
 *
 * const baseCoder = struct({ type: u8(), data: bytes(1) });
 *
 * const msgCoder = refineSwitch(
 *   baseCoder,
 *   {
 *     known: knownRefiner(),
 *     unknown: unknownRefiner(),
 *   },
 *   {
 *     refine: (msg: BaseMsg, _ctx: Context) => msg.type === 1 ? "known" : "unknown",
 *     unrefine: (msg: KnownMsg | UnknownMsg, _ctx: Context) => ("value" in msg) ? "known" : "unknown",
 *   }
 * );
 *
 * const buffer = new Uint8Array(10);
 * const unknown: UnknownMsg = { type: 99, data: new Uint8Array([42]) };
 *
 * // @ts-ignore - Complex union type inference
 * const written = msgCoder.encode(unknown, buffer);
 * const [decoded] = msgCoder.decode(buffer);
 *
 * assertEquals((decoded as UnknownMsg).type, 99);
 * assertEquals((decoded as UnknownMsg).data[0], 42);
 * ```
 */
export function refineSwitch<
  TBase,
  // deno-lint-ignore no-explicit-any
  const TRefiners extends Record<string, Refiner<TBase, any, []>>,
>(
  baseCoder: Coder<TBase>,
  refiners: TRefiners,
  selector: {
    /**
     * Select which refiner to apply during decode.
     *
     * This function receives the base decoded value and must return a key
     * from the refiners record, or null to throw an error.
     *
     * @param base - The base decoded value
     * @param context - The decoding context
     * @returns The refiner key to use, or null to error
     */
    refine: (base: TBase, context: Context) => keyof TRefiners | null;

    /**
     * Select which refiner to reverse during encode.
     *
     * This function receives the refined value and must return a key
     * from the refiners record, or null to throw an error.
     *
     * @param refined - The refined value to encode
     * @param context - The encoding context
     * @returns The refiner key to use, or null to error
     */
    unrefine: (
      refined: RefinedUnion<TRefiners>,
      context: Context,
    ) => keyof TRefiners | null;
  },
): Coder<RefinedUnion<TRefiners>> {
  const refinerKeys = Object.keys(refiners);

  let self: Coder<RefinedUnion<TRefiners>>;
  return self = {
    [kCoderKind]: kKindRefineSwitch,
    encode: (refined, buffer, context) => {
      const ctx = context ?? createContext("encode");
      refSetValue(ctx, self, refined);

      // Select which refiner to use for encoding
      const key = selector.unrefine(refined, ctx);
      if (key === null) {
        throw new Error(
          `refineSwitch: selector.unrefine returned null for value. ` +
            `No refiner selected. Available refiners: ${
              refinerKeys.join(", ")
            }`,
        );
      }

      const refiner = refiners[key as string];
      if (!refiner) {
        throw new Error(
          `refineSwitch: Invalid refiner key "${
            String(key)
          }" returned by selector.unrefine. ` +
            `Available refiners: ${refinerKeys.join(", ")}`,
        );
      }

      // Unrefine the value back to base type
      // deno-lint-ignore no-explicit-any
      const base = refiner.unrefine(refined as any, ctx);

      // Encode the base value
      return baseCoder.encode(base, buffer, ctx);
    },
    decode: (buffer, context) => {
      const ctx = context ?? createContext("decode");

      // Decode the base value
      const [base, bytesRead] = baseCoder.decode(buffer, ctx);

      // Select which refiner to use for decoding
      const key = selector.refine(base, ctx);
      if (key === null) {
        throw new Error(
          `refineSwitch: selector.refine returned null for value. ` +
            `No refiner selected. Available refiners: ${
              refinerKeys.join(", ")
            }`,
        );
      }

      const refiner = refiners[key as string];
      if (!refiner) {
        throw new Error(
          `refineSwitch: Invalid refiner key "${
            String(key)
          }" returned by selector.refine. ` +
            `Available refiners: ${refinerKeys.join(", ")}`,
        );
      }

      // Refine the base value to the target type
      const refined = refiner.refine(base, ctx);
      refSetValue(ctx, self, refined);

      return [refined, bytesRead];
    },
  };
}
