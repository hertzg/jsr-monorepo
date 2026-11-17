/**
 * The decode side of an RTSP connection: octets in, RTSP messages and `$`
 * blocks out.
 *
 * A TCP read ends anywhere, so one chunk may hold half an item or several.
 * {@link createRtspDecodeStream} keeps what is left over and emits each item
 * once all of it has arrived.
 *
 * @example Decode a response that arrives in two chunks
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createRtspDecodeStream } from "@hertzg/rtsp/streams/decode";
 *
 * const octets = new TextEncoder().encode("RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n");
 *
 * const items = await Array.fromAsync(
 *   ReadableStream.from([octets.subarray(0, 10), octets.subarray(10)])
 *     .pipeThrough(createRtspDecodeStream()),
 * );
 *
 * assertEquals(items, [{
 *   rtspVersion: "RTSP/2.0",
 *   statusCode: 200,
 *   reasonPhrase: "OK",
 *   headers: [["CSeq", "3"]],
 *   messageBody: new Uint8Array(0),
 * }]);
 * ```
 *
 * @module
 */

import {
  decodeInterleavedBinaryData,
  type InterleavedBinaryData,
} from "../encoding/interleaved.ts";
import { decodeMessage } from "../encoding/message.ts";
import { parseMessage, type RtspMessage } from "../protocol/message.ts";

const CR = 13;
const LF = 10;
const CRLF_LENGTH_OCTETS = 2;

/** The `$` octet that opens interleaved binary data. */
const DOLLAR_OCTET = 0x24;

/**
 * Creates a stream that turns the octets of an RTSP connection into RTSP
 * messages and interleaved binary data, in the order they arrive.
 *
 * Empty lines (CRLF) between items are skipped. After them, a `$` starts
 * interleaved binary data and any other octet starts a message. An item that
 * is not all there yet is kept until the next chunk, and a chunk that holds
 * several items emits all of them.
 *
 * Emitted items do not share memory with the chunks written, so the writer
 * may reuse its buffer.
 *
 * When the stream ends inside an item, the readable side fails with an
 * `Error` whose message is `RTSP stream ended inside an item with N octets
 * left over`. Ending between items, or after empty lines only, is a clean
 * end.
 *
 * @returns A stream to pipe the connection's readable side through.
 *
 * @example Decode a `$` block between two responses
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createRtspDecodeStream } from "@hertzg/rtsp/streams/decode";
 * import { isInterleavedBinaryData } from "@hertzg/rtsp/encoding/interleaved";
 *
 * const octets = new TextEncoder().encode(
 *   "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n" +
 *     "$\x00\x00\x02AB" +
 *     "RTSP/2.0 200 OK\r\nCSeq: 4\r\n\r\n",
 * );
 *
 * const items = await Array.fromAsync(
 *   ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
 * );
 *
 * assertEquals(items.map(isInterleavedBinaryData), [false, true, false]);
 * assertEquals(items[1], {
 *   channelId: 0,
 *   binaryData: new Uint8Array([0x41, 0x42]),
 * });
 * ```
 *
 * @example Fail when the stream ends inside a message
 * ```ts
 * import { assertRejects } from "@std/assert";
 * import { createRtspDecodeStream } from "@hertzg/rtsp/streams/decode";
 *
 * const octets = new TextEncoder().encode("RTSP/2.0 200 OK\r\nCSeq: 3\r\n");
 *
 * await assertRejects(
 *   () =>
 *     Array.fromAsync(
 *       ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
 *     ),
 *   Error,
 *   "RTSP stream ended inside an item with 26 octets left over",
 * );
 * ```
 */
export function createRtspDecodeStream(): TransformStream<
  Uint8Array,
  RtspMessage | InterleavedBinaryData
> {
  let tail = new Uint8Array(0);

  return new TransformStream({
    transform(chunk, controller) {
      const octets = joinOctets(tail, chunk);
      let offset = skipEmptyLines(octets, 0);
      for (
        let decoded = decodeItem(octets.subarray(offset));
        decoded !== undefined;
        decoded = decodeItem(octets.subarray(offset))
      ) {
        const [item, bytesRead] = decoded;
        controller.enqueue(item);
        offset = skipEmptyLines(octets, offset + bytesRead);
      }
      tail = octets.slice(offset);
    },

    flush() {
      if (tail.length > 0) {
        throw new Error(
          `RTSP stream ended inside an item with ${tail.length} octets left over`,
        );
      }
    },
  });
}

/**
 * Decodes the item at the start of `octets`, which must not start with an
 * empty line. Returns `undefined` when the item is not all there yet.
 */
function decodeItem(
  octets: Uint8Array,
): [RtspMessage | InterleavedBinaryData, number] | undefined {
  if (octets[0] === DOLLAR_OCTET) {
    return decodeInterleavedBinaryData(octets);
  }
  const decoded = decodeMessage(octets);
  if (decoded === undefined) {
    return undefined;
  }
  const [frame, bytesRead] = decoded;
  return [parseMessage(frame), bytesRead];
}

/** Returns the index of the first octet at or after `start` that is not part of a CRLF. */
function skipEmptyLines(octets: Uint8Array, start: number): number {
  let index = start;
  while (octets[index] === CR && octets[index + 1] === LF) {
    index += CRLF_LENGTH_OCTETS;
  }
  return index;
}

/** Returns `chunk` appended to `tail` in a new array, or `chunk` itself when there is no tail. */
function joinOctets(tail: Uint8Array, chunk: Uint8Array): Uint8Array {
  if (tail.length === 0) {
    return chunk;
  }
  const octets = new Uint8Array(tail.length + chunk.length);
  octets.set(tail);
  octets.set(chunk, tail.length);
  return octets;
}
