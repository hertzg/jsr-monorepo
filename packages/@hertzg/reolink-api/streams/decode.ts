/**
 * Decode stream: bytes to Baichuan messages.
 *
 * @example Decode a subscribe reply that arrives in two chunks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeHex } from "@std/encoding/hex";
 * import { createBaichuanDecodeStream } from "@hertzg/reolink-api/streams/decode";
 *
 * const bytes = decodeHex("f0debc0a1f00000000000000fb030000c800146400000000");
 *
 * const messages = await Array.fromAsync(
 *   ReadableStream.from([bytes.subarray(0, 10), bytes.subarray(10)])
 *     .pipeThrough(createBaichuanDecodeStream()),
 * );
 *
 * assertEquals(messages.length, 1);
 * assertEquals(messages[0].header.cmdId, 31);
 * assertEquals(messages[0].header.code, 200);
 * ```
 *
 * @module
 */

import { concat } from "@std/bytes";
import { baichuanHeader, headerLength } from "../encoding/header.ts";
import type { BaichuanMessage } from "../protocol/message.ts";

/**
 * Creates a TransformStream that frames a Baichuan byte stream into messages.
 *
 * Chunks may split or join messages at any byte; the stream buffers until a
 * whole message is in. The body is split from the payload at
 * `header.payloadOffset`, where `0` or absent means the whole rest is body.
 * Bodies stay encrypted, see `decryptBody` in
 * `@hertzg/reolink-api/protocol/message`.
 *
 * The stream errors when a message does not start with the magic, and when
 * the input ends partway through a message.
 *
 * @returns A TransformStream from bytes to messages.
 *
 * @example Decode two messages from one chunk
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeHex } from "@std/encoding/hex";
 * import { createBaichuanDecodeStream } from "@hertzg/reolink-api/streams/decode";
 *
 * const reply = decodeHex("f0debc0a1f00000000000000fb030000c800146400000000");
 *
 * const messages = await Array.fromAsync(
 *   ReadableStream.from([new Uint8Array([...reply, ...reply])])
 *     .pipeThrough(createBaichuanDecodeStream()),
 * );
 *
 * assertEquals(messages.length, 2);
 * ```
 */
export function createBaichuanDecodeStream(): TransformStream<
  Uint8Array,
  BaichuanMessage
> {
  const header = baichuanHeader();
  let buffer = new Uint8Array(0);

  return new TransformStream({
    transform(chunk, controller) {
      buffer = concat([buffer, chunk]);
      while (buffer.length >= 20) {
        const length = headerLength((buffer[18] << 8) | buffer[19]);
        if (buffer.length < length) {
          break;
        }
        const [decoded] = header.decode(buffer);
        const end = length + decoded.bodyLength;
        if (buffer.length < end) {
          break;
        }
        const split = length + (decoded.payloadOffset || decoded.bodyLength);
        controller.enqueue({
          header: decoded,
          body: buffer.slice(length, split),
          payload: buffer.slice(split, end),
        });
        buffer = buffer.slice(end);
      }
    },
    flush(controller) {
      if (buffer.length > 0) {
        controller.error(
          new Error(
            `Baichuan stream ended with ${buffer.length} bytes of an incomplete message`,
          ),
        );
      }
    },
  });
}
