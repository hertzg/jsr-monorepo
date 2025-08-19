import { type RefsWeakMap, withRefsInContext } from "./ref/ref.ts";

export const kCoderKind = Symbol("kCoderKind");
export const kCtxRefs = Symbol("ctxRefs");

export type ValueWithBytes<T> = [T, number];

export interface Context {
  direction: "encode" | "decode";
  [kCtxRefs]?: RefsWeakMap;
}

/**
 * Creates a default context for encoding or decoding operations.
 *
 * @param direction - The direction of the operation ("encode" or "decode")
 * @returns A new Context with the specified direction and an empty refs WeakMap
 */
export function createContext(direction: "encode" | "decode"): Context {
  return withRefsInContext({ direction });
}

export type Encoder<TDecoded> = (
  decoded: TDecoded,
  target: Uint8Array,
  context?: Context,
) => number;
export type Decoder<TDecoded> = (
  encoded: Uint8Array,
  context?: Context,
) => ValueWithBytes<TDecoded>;

export type Coder<TDecoded> = {
  [kCoderKind]: symbol;
  encode: Encoder<TDecoded>;
  decode: Decoder<TDecoded>;
};

/**
 * Type guard to check if a value is a Coder.
 *
 * @param value - The value to check
 * @returns True if the value is a Coder, false otherwise
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isCoder } from "@hertzg/binstruct";
 * import { u16le, u32le } from "@hertzg/binstruct/numeric";
 * import { struct } from "@hertzg/binstruct/struct";
 *
 * // Example: Dynamic coder selection based on runtime type checking
 * function createFlexibleCoder(value: unknown) {
 *   if (isCoder(value)) {
 *     // TypeScript now knows value is a Coder<unknown>
 *     // We can use it directly or with type assertion for specific types
 *     return value;
 *   } else {
 *     // Fallback to a default coder
 *     return u16le();
 *   }
 * }
 *
 * // Example: Processing different coder types
 * const numericCoder = u16le();
 * const structCoder = struct({ id: u32le(), value: u16le() });
 *
 * // Type-safe coder usage after type guard
 * if (isCoder(numericCoder)) {
 *   const buffer = new Uint8Array(100);
 *   const bytes = numericCoder.encode(42, buffer);
 *   const [decoded, bytesRead] = numericCoder.decode(buffer);
 *   assertEquals(decoded, 42);
 *   assertEquals(bytes, bytesRead);
 * }
 *
 * // The type guard works with any coder type
 * assertEquals(isCoder(numericCoder), true);
 * assertEquals(isCoder(structCoder), true);
 * assertEquals(isCoder("not a coder"), false);
 * assertEquals(isCoder(null), false);
 * assertEquals(isCoder(undefined), false);
 * ```
 */
export function isCoder<TDecoded>(value: unknown): value is Coder<TDecoded> {
  return (
    typeof value === "object" &&
    value !== null &&
    "encode" in value &&
    "decode" in value &&
    typeof value.encode === "function" &&
    typeof value.decode === "function" &&
    kCoderKind in value
  );
}
