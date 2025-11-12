/**
 * MikroTik API encode stream
 *
 * TransformStream that converts Command objects to Uint8Array bytes
 */

import { encodeSentence } from "../encoding/sentence.ts";
import { type Command, commandToWords } from "../protocol/command.ts";

/**
 * Creates a TransformStream that encodes Command objects into MikroTik API binary format
 *
 * This stream converts high-level Command objects into binary-encoded sentences
 * ready for transmission over a network connection.
 *
 * @returns TransformStream<Command, Uint8Array>
 */
export function createApiEncodeStream(): TransformStream<Command, Uint8Array> {
  return new TransformStream({
    transform(command: Command, controller) {
      try {
        // Convert command to words
        const words = commandToWords(command);

        // Encode words to bytes
        const bytes = encodeSentence(words);

        // Enqueue the encoded bytes
        controller.enqueue(bytes);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(
          new Error(`Failed to encode command: ${message}`, {
            cause: error,
          }),
        );
      }
    },
  });
}
