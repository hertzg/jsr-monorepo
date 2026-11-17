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
 * A request sent by the server goes to the `onRequest` handler, and its
 * answer is written back. `close()` ends the connection. A connection that
 * fails or is ended by the server rejects every waiting request and fails
 * every claimed channel with the same error.
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
 *
 * await client.close();
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

const CLOSED_MESSAGE = "RTSP client is closed";
const ENDED_MESSAGE = "RTSP connection ended";

/** The two sides of the connection a client runs on, and how it answers the server. */
export type ClientOptions = {
  /** The octets the server sends. */
  readable: ReadableStream<Uint8Array>;
  /** Where the octets for the server go. */
  writable: WritableStream<Uint8Array>;
  /**
   * Answers a request sent by the server. Default: `501 Not Implemented`.
   *
   * The client sets the request's `CSeq` on a copy of the answer, so the
   * handler does not have to. The handler does not hold the connection up:
   * responses and `$` blocks that arrive while it works are handled, and
   * answers go out in the order the handlers finish.
   *
   * When the handler throws or rejects, the server gets
   * `500 Internal Server Error` and the error is reported nowhere else, so a
   * handler that wants its errors seen catches them itself.
   */
  onRequest?: (request: RtspRequest) => RtspResponse | Promise<RtspResponse>;
};

/** An RTSP client, made by {@link createClient}. */
export type Client = {
  /**
   * Sends a request and resolves with its final response.
   *
   * The client sets `CSeq` itself, on a copy: the request passed in and its
   * `Headers` are left as they are.
   *
   * Rejects when the connection ends before the response arrives, and at
   * once when it has ended already: with an `Error` whose message is
   * `RTSP client is closed` after `close()`, with one whose message is
   * `RTSP connection ended` after the server ended the connection, and with
   * the error of the readable or writable side, as it is, after that side
   * failed.
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
   *
   * `close()` closes the readable side. A connection that fails or is ended
   * by the server fails it with the error that `request()` rejects with.
   * From then on, writing rejects with that error, and a call for a Channel
   * ID claims nothing: it returns a pair whose readable side has failed with
   * it.
   */
  channel: (channelId: number) => ReadableWritablePair<Uint8Array, Uint8Array>;
  /**
   * How many `$` blocks were dropped, by Channel ID, because nobody had
   * claimed that Channel ID when they arrived. A live view: it changes as
   * blocks are dropped.
   */
  droppedBlocks: ReadonlyMap<number, number>;
  /**
   * Ends the connection: closes the writable side once everything written
   * has gone out, cancels the readable side, rejects the requests still
   * waiting and closes the readable side of every claimed channel.
   *
   * Resolves when both sides are done, so it waits for a server that is slow
   * to take what was written. Rejects with the error of the writable side
   * when closing it fails. Calling it again, or after the connection has
   * ended some other way, does nothing.
   */
  close: () => Promise<void>;
};

type Item = RtspMessage | InterleavedBinaryData;

/** Everything one connection owns. The named parts below all work on it. */
type Connection = {
  reader: ReadableStreamDefaultReader<Item>;
  /** The one writer: every item sent goes through it, so each goes out whole. */
  writer: WritableStreamDefaultWriter<Item>;
  /** Settles when the encoded octets stop flowing into the writable side. */
  piped: Promise<void>;
  onRequest: ClientOptions["onRequest"];
  /** Set once, when the connection ends: by `close()`, by the server or by a failure. */
  ended?: { reason: unknown };
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
 * The connection ends on `close()`, when the server ends it, or when its
 * readable or writable side fails. Every waiting request then rejects and
 * every later one rejects at once, as `request` describes.
 *
 * @param options The two sides of the connection, and the handler for
 * requests sent by the server.
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
 *
 * @example Answer a request sent by the server
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createClient } from "@hertzg/rtsp/client";
 *
 * const toServer = new TransformStream<Uint8Array, Uint8Array>();
 * const toClient = new TransformStream<Uint8Array, Uint8Array>();
 * createClient({
 *   readable: toClient.readable,
 *   writable: toServer.writable,
 *   onRequest: (request) => ({
 *     rtspVersion: request.rtspVersion,
 *     statusCode: 200,
 *     reasonPhrase: "OK",
 *     headers: new Headers(),
 *     messageBody: new Uint8Array(0),
 *   }),
 * });
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode("OPTIONS * RTSP/2.0\r\nCSeq: 7\r\n\r\n"),
 * );
 *
 * const { value: answer } = await toServer.readable.getReader().read();
 * assertEquals(
 *   new TextDecoder().decode(answer),
 *   "RTSP/2.0 200 OK\r\nCSeq: 7\r\n\r\n",
 * );
 * ```
 *
 * @example Close the client while a request is waiting
 * ```ts
 * import { assertRejects } from "@std/assert";
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
 * const closed = client.close();
 * await assertRejects(() => response, Error, "RTSP client is closed");
 * await closed;
 * ```
 */
export function createClient(options: ClientOptions): Client {
  const encodeStream = createRtspEncodeStream();
  const connection: Connection = {
    reader: options.readable.pipeThrough(createRtspDecodeStream()).getReader(),
    writer: encodeStream.writable.getWriter(),
    piped: encodeStream.readable.pipeTo(options.writable),
    onRequest: options.onRequest,
    pendingResponses: new Map(),
    nextCSeq: FIRST_C_SEQ,
    channels: new Map(),
    droppedBlocks: new Map(),
  };

  connection.piped.catch((cause) => failConnection(connection, cause));
  runReadLoop(connection).then(
    () => failConnection(connection, new Error(ENDED_MESSAGE)),
    (cause) => failConnection(connection, cause),
  );

  return {
    request: (request) => sendRequest(connection, request),
    channel: (channelId) => claimChannel(connection, channelId).pair,
    droppedBlocks: connection.droppedBlocks,
    close: () => closeConnection(connection),
  };
}

/** Writes one item through the one writer, or rejects with the reason the connection ended. */
function writeItem(connection: Connection, item: Item): Promise<void> {
  return connection.ended === undefined
    ? connection.writer.write(item)
    : Promise.reject(connection.ended.reason);
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
      writeItem(connection, { ...request, headers }),
    ]);
    return response;
  } finally {
    connection.pendingResponses.delete(cSeq);
  }
}

/**
 * Returns the claimed channel for `channelId`, claiming it first when nobody
 * holds it. On an ended connection nothing is claimed: the channel returned
 * has failed with the reason the connection ended.
 */
function claimChannel(connection: Connection, channelId: number): Channel {
  const claimed = connection.channels.get(channelId);
  if (claimed !== undefined) {
    return claimed;
  }

  const channel = openChannel(connection, channelId);
  if (connection.ended === undefined) {
    connection.channels.set(channelId, channel);
  } else {
    channel.controller.error(connection.ended.reason);
  }
  return channel;
}

/** Builds the two sides of a channel, without claiming its Channel ID. */
function openChannel(connection: Connection, channelId: number): Channel {
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
    write: (binaryData) => writeItem(connection, { channelId, binaryData }),
  });

  const channel: Channel = {
    pair: { readable, writable },
    controller,
    pulled: Promise.withResolvers(),
  };
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

/**
 * Routes one item from the server. Only a `$` block is waited for: a request
 * is answered on the side, so a slow handler does not stop the read loop.
 */
async function handleItem(connection: Connection, item: Item): Promise<void> {
  if (isInterleavedBinaryData(item)) {
    await handleInterleavedBinaryData(connection, item);
  } else if (isResponse(item)) {
    handleResponse(connection, item);
  } else {
    // The write fails only on an ended connection, which has told everyone
    // who waits on it already.
    answerRequest(connection, item).catch(() => {});
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

/** Writes the answer to a request from the server, on a copy that carries the request's `CSeq`. */
async function answerRequest(
  connection: Connection,
  request: RtspRequest,
): Promise<void> {
  const answer = await buildAnswer(connection, request);
  const headers = new Headers(answer.headers);
  const cSeq = request.headers.get("CSeq");
  if (cSeq === null) {
    headers.delete("CSeq");
  } else {
    headers.set("CSeq", cSeq);
  }
  await writeItem(connection, { ...answer, headers });
}

/**
 * Asks the `onRequest` handler for the answer to a request. Without a handler
 * the answer is 501, and 500 when the handler throws or rejects.
 */
async function buildAnswer(
  connection: Connection,
  request: RtspRequest,
): Promise<RtspResponse> {
  if (connection.onRequest === undefined) {
    return createAnswer(request, {
      statusCode: 501,
      reasonPhrase: "Not Implemented",
    });
  }
  try {
    return await connection.onRequest(request);
  } catch {
    return createAnswer(request, {
      statusCode: 500,
      reasonPhrase: "Internal Server Error",
    });
  }
}

/** Builds an answer with no header fields and no message body, in the request's RTSP version. */
function createAnswer(
  request: RtspRequest,
  status: Pick<RtspResponse, "statusCode" | "reasonPhrase">,
): RtspResponse {
  return {
    rtspVersion: request.rtspVersion,
    ...status,
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  };
}

/**
 * Ends the connection on the caller's wish: lets what was written go out,
 * then closes the writable side and cancels the readable side.
 */
async function closeConnection(connection: Connection): Promise<void> {
  if (connection.ended !== undefined) {
    return;
  }
  for (const channel of endConnection(connection, new Error(CLOSED_MESSAGE))) {
    channel.controller.close();
  }
  await Promise.all([
    connection.writer.close(),
    connection.piped,
    connection.reader.cancel(),
  ]);
}

/**
 * Ends the connection because it broke or the server ended it, and lets go
 * of both sides. Does nothing on a connection that has ended already.
 */
function failConnection(connection: Connection, cause: unknown): void {
  if (connection.ended !== undefined) {
    return;
  }
  for (const channel of endConnection(connection, cause)) {
    channel.controller.error(cause);
  }
  connection.writer.abort(cause).catch(() => {});
  connection.reader.cancel(cause).catch(() => {});
}

/**
 * Marks the connection as ended, rejects the waiting requests with `reason`
 * and lets the read loop go if it waits on a channel. Returns the channels
 * that were claimed, for the caller to close or fail.
 */
function endConnection(connection: Connection, reason: unknown): Channel[] {
  connection.ended = { reason };
  for (const pending of connection.pendingResponses.values()) {
    pending.reject(reason);
  }
  connection.pendingResponses.clear();

  const channels = [...connection.channels.values()];
  connection.channels.clear();
  for (const channel of channels) {
    channel.pulled.resolve();
  }
  return channels;
}
