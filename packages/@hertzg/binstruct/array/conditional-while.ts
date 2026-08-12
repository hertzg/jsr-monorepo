import {
  type Coder,
  type Context,
  createContext,
  kCoderKind,
} from "../core.ts";
import { refSetValue } from "../ref/ref.ts";

/**
 * Symbol identifier for conditional while-loop array coders.
 */
export const kKindArrayWhile = Symbol("arrayWhile");

/**
 * Condition function type for arrayWhile that determines when to continue processing array elements.
 *
 * @param params - Object containing all parameters for the condition
 * @param params.index - Current iteration index (0-based)
 * @param params.array - Elements accumulated so far (being filled during decode)
 * @param params.buffer - Remaining buffer data from the current cursor position
 * @param params.context - Encoding/decoding context
 * @returns True to continue processing, false to stop
 */
export type ArrayWhileCondition<TDecoded> = (params: {
  index: number;
  array: TDecoded[];
  buffer: Uint8Array;
  context: Context;
}) => boolean;

/**
 * Creates a Coder for arrays using a custom condition function to determine when to stop.
 *
 * This is the most flexible array coder that can handle any termination logic.
 * The condition function has access to the current state and can implement complex logic
 * like null termination, conditional arrays, or custom termination conditions.
 *
 * Note: For length-prefixed arrays, use {@link arrayLP}. For fixed-length arrays, use {@link arrayFL}.
 * This function is best suited for custom termination logic that doesn't fit the standard patterns.
 *
 * @param elementType - The coder for individual array elements
 * @param condition - Function that determines when to continue processing
 * @returns A Coder that can encode/decode arrays using the custom condition
 */

export function arrayWhile<TDecoded>(
  elementType: Coder<TDecoded>,
  condition: ArrayWhileCondition<TDecoded>,
): Coder<TDecoded[]> {
  let self: Coder<TDecoded[]>;
  return self = {
    [kCoderKind]: kKindArrayWhile,
    encode: (decoded, target, context) => {
      const ctx = context ?? createContext("encode");
      let cursor = 0;

      refSetValue(ctx, self, decoded);

      for (let i = 0; i < decoded.length; i++) {
        const remaining = target.subarray(cursor);
        if (
          !condition({
            index: i,
            array: decoded,
            buffer: remaining,
            context: ctx,
          })
        ) {
          break;
        }
        cursor += elementType.encode(decoded[i], remaining, ctx);
      }

      return cursor;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      let cursor = 0;

      const decoded: TDecoded[] = [];
      refSetValue(ctx, self, decoded);

      while (cursor < encoded.length) {
        const remaining = encoded.subarray(cursor);
        if (
          !condition({
            index: decoded.length,
            array: decoded,
            buffer: remaining,
            context: ctx,
          })
        ) {
          break;
        }

        const [element, bytesRead] = elementType.decode(remaining, ctx);
        cursor += bytesRead;
        decoded.push(element);
      }

      return [decoded, cursor];
    },
  };
}
