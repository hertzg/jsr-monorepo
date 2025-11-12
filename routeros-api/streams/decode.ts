/**
 * MikroTik API decode stream
 *
 * TransformStream that converts Uint8Array bytes to Reply objects
 */

import { decodeSentence } from "../encoding/sentence.ts";
import { parseReply, type Reply } from "../protocol/reply.ts";

/**
 * Creates a TransformStream that decodes MikroTik API binary format into Reply objects
 *
 * This stream converts binary-encoded sentences from the network into high-level
 * Reply objects. It handles incomplete data by buffering until complete sentences
 * are available.
 *
 * @returns TransformStream<Uint8Array, Reply>
 */
export function createApiDecodeStream(): TransformStream<Uint8Array, Reply> {
  let buffer = new Uint8Array(0);

  return new TransformStream({
    transform(chunk: Uint8Array, controller) {
      try {
        // Append new chunk to buffer
        const newBuffer = new Uint8Array(buffer.length + chunk.length);
        newBuffer.set(buffer, 0);
        newBuffer.set(chunk, buffer.length);
        buffer = newBuffer;

        // Try to decode sentences from buffer
        let offset = 0;
        while (offset < buffer.length) {
          // Check if we have at least one byte (for zero-length terminator or length byte)
          if (offset >= buffer.length) break;

          // Check for immediate terminator (empty sentence - skip it)
          if (buffer[offset] === 0x00) {
            offset++;
            continue;
          }

          try {
            // Try to decode a sentence
            const { words, bytesRead } = decodeSentence(buffer, { offset });

            // Parse the sentence into a Reply
            const reply = parseReply(words);

            // Enqueue the reply
            controller.enqueue(reply);

            // Move offset forward
            offset += bytesRead;
          } catch (error) {
            // If decoding fails due to incomplete data, break and wait for more
            if (
              error instanceof RangeError &&
              (error.message.includes("Incomplete") ||
                error.message.includes("out of bounds"))
            ) {
              break;
            }
            // Other errors are real errors
            throw error;
          }
        }

        // Remove processed bytes from buffer
        if (offset > 0) {
          buffer = buffer.slice(offset);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        controller.error(
          new Error(`Failed to decode reply: ${message}`, {
            cause: error,
          }),
        );
      }
    },

    flush(controller) {
      // On stream end, check if there's remaining data
      if (buffer.length > 0) {
        controller.error(
          new Error(
            `Stream ended with ${buffer.length} bytes of incomplete data`,
          ),
        );
      }
    },
  });
}
