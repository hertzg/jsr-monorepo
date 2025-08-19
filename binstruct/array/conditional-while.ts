import {
  type Coder,
  type Context,
  createContext,
  kCoderKind,
} from "../core.ts";
import { refSetValue } from "../ref/ref.ts";

export const kKindArrayWhile = Symbol("arrayWhile");

/**
 * Condition function type for arrayWhile that determines when to continue processing array elements.
 *
 * @param params - Object containing all parameters for the condition
 * @param params.index - Current iteration index (0-based)
 * @param params.element - Current element being processed (null during decode when element not yet available)
 * @param params.context - Encoding/decoding context
 * @param params.cursor - Current position in the buffer
 * @param params.remaining - Remaining buffer data from cursor position
 * @param params.args - Additional arguments passed to the condition function
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
 * @param args - Additional arguments to pass to the condition function
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
        if (
          !condition({
            index: i,
            array: decoded,
            buffer: target.subarray(cursor),
            context: ctx,
          })
        ) {
          break;
        }
        cursor += elementType.encode(
          decoded[i],
          target.subarray(cursor),
          ctx,
        );
      }

      return cursor;
    },
    decode: (encoded, context) => {
      const ctx = context ?? createContext("decode");
      let cursor = 0;

      const decoded: TDecoded[] = [];
      refSetValue(ctx, self, decoded);

      let i = 0;

      while (cursor < encoded.length) {
        if (
          !condition({
            index: i,
            array: decoded,
            buffer: encoded.subarray(cursor),
            context: ctx,
          })
        ) {
          break;
        }

        const [element, bytesRead] = elementType.decode(
          encoded.subarray(cursor),
          ctx,
        );
        cursor += bytesRead;
        decoded[i] = element;
        i++;
      }

      return [decoded, cursor];
    },
  };
}
