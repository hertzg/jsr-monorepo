import { type RefsWeakMap, withRefsInContext } from "./ref/ref.ts";

/**
 * Symbol identifier for coder kind.
 */
export const kCoderKind = Symbol("kCoderKind");
/**
 * Symbol identifier for context references.
 */
export const kCtxRefs = Symbol("ctxRefs");

/**
 * Type representing a value with its byte count.
 * @template T - The type of the value
 */
export type ValueWithBytes<T> = [T, number];

/**
 * Context for encoding/decoding operations.
 */
export interface Context {
  /** The direction of the operation */
  direction: "encode" | "decode";
  /** Optional references storage */
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

/**
 * Function type for encoding values.
 * @template TDecoded - The type of the value to encode
 */
export type Encoder<TDecoded> = (
  decoded: TDecoded,
  target: Uint8Array,
  context?: Context,
) => number;
/**
 * Function type for decoding values.
 * @template TDecoded - The type of the value to decode
 */
export type Decoder<TDecoded> = (
  encoded: Uint8Array,
  context?: Context,
) => ValueWithBytes<TDecoded>;

/**
 * Interface for coders that can encode and decode values.
 * @template TDecoded - The type of the value to encode/decode
 */
export type Coder<TDecoded> = {
  [kCoderKind]: symbol;
  encode: Encoder<TDecoded>;
  decode: Decoder<TDecoded>;
};

/**
 * Type guard to check if a value is a Coder.
 *
 * This function verifies that a value implements the Coder interface by checking
 * for the presence of encode and decode methods and the kCoderKind symbol.
 *
 * @param value - The value to check
 * @returns True if the value is a Coder, false otherwise
 *
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isCoder, u16le, u32be } from "@hertzg/binstruct";
 *
 * // Check valid coders
 * const validCoder = u16le();
 * assertEquals(isCoder(validCoder), true);
 *
 * const anotherCoder = u32be();
 * assertEquals(isCoder(anotherCoder), true);
 *
 * // Check invalid values
 * assertEquals(isCoder(null), false);
 * assertEquals(isCoder(undefined), false);
 * assertEquals(isCoder(42), false);
 * assertEquals(isCoder("string"), false);
 * assertEquals(isCoder({ encode: "not a function" }), false);
 * assertEquals(isCoder({ decode: () => {} }), false);
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
