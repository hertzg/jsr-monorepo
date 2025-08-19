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
