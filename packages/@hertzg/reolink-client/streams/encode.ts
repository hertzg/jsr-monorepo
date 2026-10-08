/**
 * Encode stream: Baichuan messages to bytes.
 *
 * @example Encode the nonce request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeHex } from "@std/encoding/hex";
 * import { createMessage } from "@hertzg/reolink-client/protocol/message";
 * import { createBaichuanEncodeStream } from "@hertzg/reolink-client/streams/encode";
 *
 * const chunks = await Array.fromAsync(
 *   ReadableStream.from([
 *     createMessage({
 *       cmdId: 1,
 *       channelId: 250,
 *       messageId: 1,
 *       messageClass: 0x1465,
 *     }),
 *   ]).pipeThrough(createBaichuanEncodeStream()),
 * );
 *
 * assertEquals(chunks, [decodeHex("f0debc0a0100000000000000fa01000012dc1465")]);
 * ```
 *
 * @module
 */

import { encode } from "@hertzg/binstruct";
import { concat } from "@std/bytes";
import { baichuanHeader } from "../encoding/header.ts";
import type { BaichuanMessage } from "../protocol/message.ts";

/**
 * Creates a TransformStream that writes each message as header, body and
 * payload, in one chunk per message.
 *
 * The header is written as given: `bodyLength` is not recomputed. Build
 * requests with `createMessage` from `@hertzg/reolink-client/protocol/message`
 * to get it right.
 *
 * @returns A TransformStream from messages to bytes.
 *
 * @example Encode a subscribe request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createMessage } from "@hertzg/reolink-client/protocol/message";
 * import { createBaichuanEncodeStream } from "@hertzg/reolink-client/streams/encode";
 *
 * const [bytes] = await Array.fromAsync(
 *   ReadableStream.from([
 *     createMessage({ cmdId: 31, channelId: 251, messageId: 3 }),
 *   ]).pipeThrough(createBaichuanEncodeStream()),
 * );
 *
 * assertEquals(bytes.length, 24);
 * ```
 */
export function createBaichuanEncodeStream(): TransformStream<
  BaichuanMessage,
  Uint8Array
> {
  const header = baichuanHeader();
  return new TransformStream({
    transform(message, controller) {
      controller.enqueue(
        concat([encode(header, message.header), message.body, message.payload]),
      );
    },
  });
}
