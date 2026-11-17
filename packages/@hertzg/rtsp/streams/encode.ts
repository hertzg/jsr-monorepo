/**
 * The encode side of an RTSP connection: RTSP messages and `$` blocks in,
 * octets out.
 *
 * Everything sent on the connection goes through the one stream from
 * {@link createRtspEncodeStream}, so each item goes out whole and items never
 * mix.
 *
 * @example Encode a request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createRtspEncodeStream } from "@hertzg/rtsp/streams/encode";
 *
 * const chunks = await Array.fromAsync(
 *   ReadableStream.from([{
 *     method: "OPTIONS",
 *     requestUri: "*",
 *     rtspVersion: "RTSP/2.0",
 *     headers: new Headers({ "CSeq": "1" }),
 *     messageBody: new Uint8Array(0),
 *   }]).pipeThrough(createRtspEncodeStream()),
 * );
 *
 * assertEquals(chunks, [
 *   new TextEncoder().encode("OPTIONS * RTSP/2.0\r\nCSeq: 1\r\n\r\n"),
 * ]);
 * ```
 *
 * @module
 */

import {
  encodeInterleavedBinaryData,
  type InterleavedBinaryData,
  isInterleavedBinaryData,
} from "../encoding/interleaved.ts";
import { encodeMessage } from "../encoding/message.ts";
import { type RtspMessage, serializeMessage } from "../protocol/message.ts";

/**
 * Creates a stream that turns RTSP messages and interleaved binary data into
 * the octets of an RTSP connection.
 *
 * Each item written comes out as one chunk, so an item is never split and two
 * items never mix. A message with a message body gets its `Content-Length`
 * set, as `encodeMessage` does.
 *
 * @returns A stream to pipe into the connection's writable side.
 *
 * @example Encode a response followed by a `$` block
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createRtspEncodeStream } from "@hertzg/rtsp/streams/encode";
 *
 * const chunks = await Array.fromAsync(
 *   ReadableStream.from([
 *     {
 *       rtspVersion: "RTSP/2.0",
 *       statusCode: 200,
 *       reasonPhrase: "OK",
 *       headers: new Headers({ "CSeq": "3" }),
 *       messageBody: new Uint8Array(0),
 *     },
 *     { channelId: 1, binaryData: new Uint8Array([0xca, 0xfe]) },
 *   ]).pipeThrough(createRtspEncodeStream()),
 * );
 *
 * assertEquals(chunks, [
 *   new TextEncoder().encode("RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n"),
 *   new Uint8Array([0x24, 0x01, 0x00, 0x02, 0xca, 0xfe]),
 * ]);
 * ```
 */
export function createRtspEncodeStream(): TransformStream<
  RtspMessage | InterleavedBinaryData,
  Uint8Array
> {
  return new TransformStream({
    transform(item, controller) {
      controller.enqueue(
        isInterleavedBinaryData(item)
          ? encodeInterleavedBinaryData(item)
          : encodeMessage(serializeMessage(item)),
      );
    },
  });
}
