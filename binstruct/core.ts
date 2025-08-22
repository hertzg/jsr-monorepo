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
 * @param value - The value to check
 * @returns True if the value is a Coder, false otherwise
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
