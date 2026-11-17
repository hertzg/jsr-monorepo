/**
 * An RTSP client over any `{ readable, writable }` byte pair.
 *
 * {@link createClient} does not open a socket: the caller passes the two
 * sides of a connection it already has. Requests are numbered with `CSeq` and
 * each one resolves with the response that carries the same number, so
 * several can be on the wire at once.
 *
 * Interleaved binary data (the `$` blocks that carry media on the same
 * connection) is read and written per Channel ID through `channel()`. A `$`
 * block for a Channel ID nobody claimed is dropped and counted in
 * `droppedBlocks`.
 *
 * @example Send a request and read its response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createClient } from "@hertzg/rtsp/client";
 *
 * const toServer = new TransformStream<Uint8Array, Uint8Array>();
 * const toClient = new TransformStream<Uint8Array, Uint8Array>();
 * const client = createClient({
 *   readable: toClient.readable,
 *   writable: toServer.writable,
 * });
 *
 * const response = client.request({
 *   method: "OPTIONS",
 *   requestUri: "*",
 *   rtspVersion: "RTSP/2.0",
 *   headers: new Headers(),
 *   messageBody: new Uint8Array(0),
 * });
 *
 * const { value: sent } = await toServer.readable.getReader().read();
 * assertEquals(
 *   new TextDecoder().decode(sent),
 *   "OPTIONS * RTSP/2.0\r\nCSeq: 1\r\n\r\n",
 * );
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode("RTSP/2.0 200 OK\r\nCSeq: 1\r\n\r\n"),
 * );
 * assertEquals((await response).statusCode, 200);
 * ```
 *
 * @module
 */

import {
  type InterleavedBinaryData,
  isInterleavedBinaryData,
} from "./encoding/interleaved.ts";
import { isResponse, type RtspMessage } from "./protocol/message.ts";
import type { RtspRequest } from "./protocol/request.ts";
import type { RtspResponse } from "./protocol/response.ts";
import { createRtspDecodeStream } from "./streams/decode.ts";
import { createRtspEncodeStream } from "./streams/encode.ts";

const FIRST_C_SEQ = 1;

/** Status-Codes below this one are 1xx: interim, with a final response to follow. */
const FIRST_FINAL_STATUS_CODE = 200;

/**
 * How many `$` blocks a claimed channel holds unread before the read loop
 * stops and waits for the channel's reader.
 *
 * It sets how far the connection runs ahead of a slow reader. At 1, nothing
 * that arrives behind an unread `$` block is handled until that block is
 * taken, and a channel never buffers more than one block of at most 65535
 * octets.
 */
const CHANNEL_QUEUE_BLOCKS = 1;

/** The two sides of the connection a client runs on. */
export type ClientOptions = {
  /** The octets the server sends. */
  readable: ReadableStream<Uint8Array>;
  /** Where the octets for the server go. */
  writable: WritableStream<Uint8Array>;
};

/** An RTSP client, made by {@link createClient}. */
export type Client = {
  /**
   * Sends a request and resolves with its final response.
   *
   * The client sets `CSeq` itself, on a copy: the request passed in and its
   * `Headers` are left as they are.
   */
  request: (request: RtspRequest) => Promise<RtspResponse>;
  /**
   * Claims a Channel ID (0 to 255) and returns its two sides.
   *
   * The readable side gives the binary data of each `$` block the server
   * sends on this Channel ID, in order. The writable side sends each chunk
   * written as one `$` block, so a chunk holds at most 65535 octets. Closing
   * or aborting the writable side leaves the connection open.
   *
   * Calling it again for a claimed Channel ID returns the same pair.
   * Cancelling the readable side gives the Channel ID up: `$` blocks for it
   * are dropped and counted again, and the next call returns a fresh pair
   * that starts with the blocks that arrive after it. Nothing is replayed.
   *
   * A claimed channel has to be read. The client handles what the server
   * sends in order, so one unread `$` block holds back everything behind it,
   * responses included, until the block is read or the readable side is
   * cancelled.
   */
  channel: (channelId: number) => ReadableWritablePair<Uint8Array, Uint8Array>;
  /**
   * How many `$` blocks were dropped, by Channel ID, because nobody had
   * claimed that Channel ID when they arrived. A live view: it changes as
   * blocks are dropped.
   */
  droppedBlocks: ReadonlyMap<number, number>;
};

type Item = RtspMessage | InterleavedBinaryData;

/** Everything one connection owns. The named parts below all work on it. */
type Connection = {
  reader: ReadableStreamDefaultReader<Item>;
  /** The one writer: every item sent goes through it, so each goes out whole. */
  writer: WritableStreamDefaultWriter<Item>;
  /** Requests still waiting for their final response, by `CSeq`. */
  pendingResponses: Map<number, PromiseWithResolvers<RtspResponse>>;
  nextCSeq: number;
  /** The claimed channels, by Channel ID. Unclaimed and cancelled ones are absent. */
  channels: Map<number, Channel>;
  droppedBlocks: Map<number, number>;
};

/** One claimed Channel ID. */
type Channel = {
  pair: ReadableWritablePair<Uint8Array, Uint8Array>;
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** Resolved each time the readable side asks for more, and when it is cancelled. */
  pulled: PromiseWithResolvers<void>;
};

/**
 * Creates an RTSP client on a connection that is already open.
 *
 * Each request gets the next `CSeq`, starting at 1, in place of any `CSeq`
 * the caller set. A response resolves the request with the same `CSeq`, so
 * responses may arrive in any order. A 1xx response is interim and is
 * skipped: the request keeps waiting for the final one. A response whose
 * `CSeq` matches no waiting request is ignored.
 *
 * @param options The readable and writable side of the connection.
 * @returns The client.
 *
 * @example Two requests answered out of order
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createClient } from "@hertzg/rtsp/client";
 *
 * const toServer = new TransformStream<Uint8Array, Uint8Array>();
 * const toClient = new TransformStream<Uint8Array, Uint8Array>();
 * const client = createClient({
 *   readable: toClient.readable,
 *   writable: toServer.writable,
 * });
 *
 * const described = client.request({
 *   method: "DESCRIBE",
 *   requestUri: "rtsp://example.com/fizzle/foo",
 *   rtspVersion: "RTSP/2.0",
 *   headers: new Headers({ "Accept": "application/sdp" }),
 *   messageBody: new Uint8Array(0),
 * });
 * const options = client.request({
 *   method: "OPTIONS",
 *   requestUri: "*",
 *   rtspVersion: "RTSP/2.0",
 *   headers: new Headers(),
 *   messageBody: new Uint8Array(0),
 * });
 *
 * const sent = toServer.readable.getReader();
 * await sent.read();
 * await sent.read();
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode(
 *     "RTSP/2.0 200 OK\r\nCSeq: 2\r\n\r\n" +
 *       "RTSP/2.0 404 Not Found\r\nCSeq: 1\r\n\r\n",
 *   ),
 * );
 *
 * assertEquals((await described).statusCode, 404);
 * assertEquals((await options).statusCode, 200);
 * ```
 *
 * @example Read and write interleaved binary data on a channel
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createClient } from "@hertzg/rtsp/client";
 *
 * const toServer = new TransformStream<Uint8Array, Uint8Array>();
 * const toClient = new TransformStream<Uint8Array, Uint8Array>();
 * const client = createClient({
 *   readable: toClient.readable,
 *   writable: toServer.writable,
 * });
 *
 * const channel = client.channel(0);
 * const server = toClient.writable.getWriter();
 *
 * await server.write(new Uint8Array([0x24, 0x00, 0x00, 0x02, 0x80, 0x60]));
 * const { value: received } = await channel.readable.getReader().read();
 * assertEquals(received, new Uint8Array([0x80, 0x60]));
 *
 * const sending = channel.writable.getWriter().write(
 *   new Uint8Array([0x80, 0xc9]),
 * );
 * const { value: sent } = await toServer.readable.getReader().read();
 * await sending;
 * assertEquals(sent, new Uint8Array([0x24, 0x00, 0x00, 0x02, 0x80, 0xc9]));
 * ```
 *
 * @example Count the `$` blocks nobody claimed
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createClient } from "@hertzg/rtsp/client";
 *
 * const toServer = new TransformStream<Uint8Array, Uint8Array>();
 * const toClient = new TransformStream<Uint8Array, Uint8Array>();
 * const client = createClient({
 *   readable: toClient.readable,
 *   writable: toServer.writable,
 * });
 *
 * const response = client.request({
 *   method: "OPTIONS",
 *   requestUri: "*",
 *   rtspVersion: "RTSP/2.0",
 *   headers: new Headers(),
 *   messageBody: new Uint8Array(0),
 * });
 * await toServer.readable.getReader().read();
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode(
 *     "$\x07\x00\x01A" +
 *       "$\x07\x00\x01B" +
 *       "RTSP/2.0 200 OK\r\nCSeq: 1\r\n\r\n",
 *   ),
 * );
 * await response;
 *
 * assertEquals(client.droppedBlocks.get(7), 2);
 * ```
 */
export function createClient(options: ClientOptions): Client {
  const encodeStream = createRtspEncodeStream();
  const connection: Connection = {
    reader: options.readable.pipeThrough(createRtspDecodeStream()).getReader(),
    writer: encodeStream.writable.getWriter(),
    pendingResponses: new Map(),
    nextCSeq: FIRST_C_SEQ,
    channels: new Map(),
    droppedBlocks: new Map(),
  };

  // A failed pipe also fails the writer, so the next write in sendRequest
  // rejects with the same error.
  encodeStream.readable.pipeTo(options.writable).catch(() => {});
  runReadLoop(connection).catch(() => {});

  return {
    request: (request) => sendRequest(connection, request),
    channel: (channelId) => claimChannel(connection, channelId).pair,
    droppedBlocks: connection.droppedBlocks,
  };
}

/** Sends a copy of `request` under the next `CSeq` and waits for its final response. */
async function sendRequest(
  connection: Connection,
  request: RtspRequest,
): Promise<RtspResponse> {
  const cSeq = connection.nextCSeq++;
  const headers = new Headers(request.headers);
  headers.set("CSeq", String(cSeq));

  const pending = Promise.withResolvers<RtspResponse>();
  connection.pendingResponses.set(cSeq, pending);
  try {
    const [response] = await Promise.all([
      pending.promise,
      connection.writer.write({ ...request, headers }),
    ]);
    return response;
  } finally {
    connection.pendingResponses.delete(cSeq);
  }
}

/**
 * Returns the claimed channel for `channelId`, claiming it first when nobody
 * holds it.
 */
function claimChannel(connection: Connection, channelId: number): Channel {
  const claimed = connection.channels.get(channelId);
  if (claimed !== undefined) {
    return claimed;
  }

  // start() runs inside the ReadableStream constructor, so the controller is
  // set by the time the channel is built.
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const readable = new ReadableStream<Uint8Array>({
    start(readableController) {
      controller = readableController;
    },
    pull() {
      channel.pulled.resolve();
    },
    cancel() {
      connection.channels.delete(channelId);
      channel.pulled.resolve();
    },
  }, { highWaterMark: CHANNEL_QUEUE_BLOCKS });
  const writable = new WritableStream<Uint8Array>({
    write: (binaryData) => connection.writer.write({ channelId, binaryData }),
  });

  const channel: Channel = {
    pair: { readable, writable },
    controller,
    pulled: Promise.withResolvers(),
  };
  connection.channels.set(channelId, channel);
  return channel;
}

/** Hands every item the server sends to {@link handleItem}, one at a time, until the connection ends. */
async function runReadLoop(connection: Connection): Promise<void> {
  for (
    let result = await connection.reader.read();
    !result.done;
    result = await connection.reader.read()
  ) {
    await handleItem(connection, result.value);
  }
}

/** Routes one item from the server. Requests are ignored. */
async function handleItem(connection: Connection, item: Item): Promise<void> {
  if (isInterleavedBinaryData(item)) {
    await handleInterleavedBinaryData(connection, item);
  } else if (isResponse(item)) {
    handleResponse(connection, item);
  }
}

/**
 * Queues a `$` block on its claimed channel, then waits for the channel's
 * reader while the queue is full. Drops and counts the block when nobody has
 * claimed its Channel ID.
 */
async function handleInterleavedBinaryData(
  connection: Connection,
  block: InterleavedBinaryData,
): Promise<void> {
  const channel = connection.channels.get(block.channelId);
  if (channel === undefined) {
    const dropped = connection.droppedBlocks.get(block.channelId) ?? 0;
    connection.droppedBlocks.set(block.channelId, dropped + 1);
    return;
  }

  channel.controller.enqueue(block.binaryData);
  if (isQueueFull(channel)) {
    channel.pulled = Promise.withResolvers();
    await channel.pulled.promise;
  }
}

/** Tells whether a channel's readable side holds as many unread blocks as it may. */
function isQueueFull(channel: Channel): boolean {
  const desiredSize = channel.controller.desiredSize;
  return desiredSize !== null && desiredSize <= 0;
}

/** Resolves the request waiting on this response, unless it is interim or nobody waits for it. */
function handleResponse(connection: Connection, response: RtspResponse): void {
  if (response.statusCode < FIRST_FINAL_STATUS_CODE) {
    return;
  }
  const cSeq = Number(response.headers.get("CSeq"));
  connection.pendingResponses.get(cSeq)?.resolve(response);
  connection.pendingResponses.delete(cSeq);
}
