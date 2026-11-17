/**
 * An RTSP client over any `{ readable, writable }` byte pair.
 *
 * {@link createClient} does not open a socket: the caller passes the two
 * sides of a connection it already has. The pair does not have to be web
 * streams of this runtime: an {@link OctetSource} and an {@link OctetSink}
 * are enough, so what `Duplex.toWeb(socket)` returns goes in as it is.
 *
 * Requests are numbered with `CSeq` and each one resolves with the response
 * that carries the same number, so several can be on the wire at once. A
 * request names its method and its Request-URI. Its RTSP version, header
 * fields and message body may be left out, see {@link ClientRequest}.
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
 * });
 *
 * const { value: sent } = await toServer.readable.getReader().read();
 * assertEquals(
 *   new TextDecoder().decode(sent),
 *   "OPTIONS * RTSP/1.0\r\nCSeq: 1\r\n\r\n",
 * );
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode("RTSP/1.0 200 OK\r\nCSeq: 1\r\n\r\n"),
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
import type { HeaderField } from "./encoding/message.ts";
import { isResponse, type RtspMessage } from "./protocol/message.ts";
import type { RtspRequest } from "./protocol/request.ts";
import type { RtspResponse } from "./protocol/response.ts";
import { createRtspDecodeStream } from "./streams/decode.ts";
import { createRtspEncodeStream } from "./streams/encode.ts";

const FIRST_C_SEQ = 1;
const C_SEQ = "CSeq";

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

/**
 * How many chunks the client holds between the connection's readable side
 * and the decoder. At 0 it reads the connection only when the decoder asks,
 * so nothing is read ahead of a slow reader.
 */
const SOURCE_QUEUE_CHUNKS = 0;

/** The version put on a request when neither the request nor the client's options name one. */
const DEFAULT_RTSP_VERSION = "RTSP/1.0";

const CLOSED_MESSAGE = "RTSP client is closed";
const ENDED_MESSAGE = "RTSP connection ended";

/**
 * The reader of an {@link OctetSource}: what the client calls to take the
 * octets the server sends. A `ReadableStreamDefaultReader<Uint8Array>` is
 * one.
 */
export type OctetReader = {
  /**
   * Resolves with the next chunk, or with `done: true` when the server has
   * ended the connection. Rejects when the connection failed. Whatever
   * `value` comes with `done: true` is not looked at.
   */
  read(): Promise<
    { done: false; value: Uint8Array } | { done: true; value?: unknown }
  >;
  /** Tells the connection that nothing more will be read. */
  cancel(reason?: unknown): Promise<void>;
};

/**
 * The writer of an {@link OctetSink}: what the client calls to send octets
 * to the server. A `WritableStreamDefaultWriter<Uint8Array>` is one.
 */
export type OctetWriter = {
  /**
   * Sends one chunk. The client waits for it to resolve before it writes the
   * next one, and takes a rejection as the failure of the connection.
   */
  write(chunk: Uint8Array): Promise<void>;
  /** Ends the writable side once everything written has gone out. */
  close(): Promise<void>;
  /** Ends the writable side at once, dropping what has not gone out. */
  abort(reason?: unknown): Promise<void>;
};

/**
 * The readable side of a connection, reduced to what the client calls. A
 * `ReadableStream<Uint8Array>` is one, whichever runtime or package typed
 * it. The client calls `getReader()` once and keeps the reader.
 */
export type OctetSource = {
  /** Returns the one reader the client reads the connection through. */
  getReader(): OctetReader;
};

/**
 * The writable side of a connection, reduced to what the client calls. A
 * `WritableStream<Uint8Array>` is one, whichever runtime or package typed
 * it. The client calls `getWriter()` once and keeps the writer.
 */
export type OctetSink = {
  /** Returns the one writer the client writes the connection through. */
  getWriter(): OctetWriter;
};

/**
 * What `request()` takes: an {@link RtspRequest} whose `rtspVersion`,
 * `headers` and `messageBody` may be left out. An `RtspRequest` is one.
 */
export type ClientRequest = {
  /** The method, such as `"DESCRIBE"`, sent as written. */
  method: string;
  /** `"*"` or an RTSP URI. */
  requestUri: string;
  /** Default: the client's `rtspVersion` option. */
  rtspVersion?: string;
  /** Default: no header fields. */
  headers?: HeaderField[];
  /** Default: no message body. */
  messageBody?: Uint8Array;
};

/** The two sides of the connection a client runs on, and how it answers the server. */
export type ClientOptions = {
  /** The octets the server sends. */
  readable: OctetSource;
  /** Where the octets for the server go. */
  writable: OctetSink;
  /**
   * The version put on a request that names none. Default: `"RTSP/1.0"`,
   * which is what cameras speak.
   */
  rtspVersion?: string;
  /**
   * Answers a request sent by the server. Default: `501 Not Implemented`.
   *
   * The client sets the request's `CSeq` on a copy of the answer, so the
   * handler does not have to. A `CSeq` the handler did set, in any case,
   * keeps its place and its spelling and gets the request's value. Without
   * one, `CSeq` goes last, spelled the way the server spelled it. The
   * handler does not hold the connection up:
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
   * A request that names no `rtspVersion` gets the client's `rtspVersion`
   * option, and `"RTSP/1.0"` without that option. One without `headers`
   * goes out with `CSeq` alone, one without `messageBody` with no message
   * body.
   *
   * The other header fields go out in the order and the spelling given. The
   * client sets `CSeq` itself, on a copy: the request passed in and its
   * `headers` are left as they are. A `CSeq` the caller did set, in any
   * case, keeps its place and its spelling and gets the client's number, and
   * later ones are left out. Without one, `CSeq` goes last.
   *
   * Rejects when the connection ends before the response arrives, and at
   * once when it has ended already: with an `Error` whose message is
   * `RTSP client is closed` after `close()`, with one whose message is
   * `RTSP connection ended` after the server ended the connection, and with
   * the error of the readable or writable side, as it is, after that side
   * failed.
   */
  request: (request: ClientRequest) => Promise<RtspResponse>;
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
  /** The version put on a request that names none. */
  rtspVersion: string;
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
 * The two sides are used through `getReader()` and `getWriter()` only, and
 * the reader and the writer through `read`, `cancel`, `write`, `close` and
 * `abort` only. The client takes both for itself and does not give them
 * back. It writes one chunk at a time and reads only when it has room for
 * what comes in.
 *
 * Each request gets the next `CSeq`, starting at 1, in place of any `CSeq`
 * the caller set. A response resolves the request with the same `CSeq`,
 * whatever case the server writes that name in, so responses may arrive in
 * any order. A 1xx response is interim and is
 * skipped: the request keeps waiting for the final one. A response whose
 * `CSeq` matches no waiting request is ignored.
 *
 * The connection ends on `close()`, when the server ends it, or when its
 * readable or writable side fails. Every waiting request then rejects and
 * every later one rejects at once, as `request` describes.
 *
 * @param options The two sides of the connection, the version for requests
 * that name none, and the handler for requests sent by the server.
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
 *   headers: [["Accept", "application/sdp"]],
 * });
 * const options = client.request({
 *   method: "OPTIONS",
 *   requestUri: "*",
 * });
 *
 * const sent = toServer.readable.getReader();
 * await sent.read();
 * await sent.read();
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode(
 *     "RTSP/1.0 200 OK\r\nCSeq: 2\r\n\r\n" +
 *       "RTSP/1.0 404 Not Found\r\nCSeq: 1\r\n\r\n",
 *   ),
 * );
 *
 * assertEquals((await described).statusCode, 404);
 * assertEquals((await options).statusCode, 200);
 * ```
 *
 * @example Send header fields in the caller's order and spelling
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
 *   method: "DESCRIBE",
 *   requestUri: "rtsp://example.com/fizzle/foo",
 *   headers: [
 *     ["cseq", ""],
 *     ["User-Agent", "PhonyClient/1.2"],
 *     ["accept", "application/sdp"],
 *   ],
 * });
 *
 * const { value: sent } = await toServer.readable.getReader().read();
 * assertEquals(
 *   new TextDecoder().decode(sent),
 *   "DESCRIBE rtsp://example.com/fizzle/foo RTSP/1.0\r\n" +
 *     "cseq: 1\r\n" +
 *     "User-Agent: PhonyClient/1.2\r\n" +
 *     "accept: application/sdp\r\n" +
 *     "\r\n",
 * );
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode(
 *     "RTSP/1.0 200 OK\r\ncseq: 1\r\nServer: PhonyServer/1.1\r\n\r\n",
 *   ),
 * );
 * assertEquals((await response).headers, [
 *   ["cseq", "1"],
 *   ["Server", "PhonyServer/1.1"],
 * ]);
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
 * });
 * await toServer.readable.getReader().read();
 *
 * await toClient.writable.getWriter().write(
 *   new TextEncoder().encode(
 *     "$\x07\x00\x01A" +
 *       "$\x07\x00\x01B" +
 *       "RTSP/1.0 200 OK\r\nCSeq: 1\r\n\r\n",
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
 *     headers: [],
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
    reader: adaptSource(options.readable)
      .pipeThrough(createRtspDecodeStream())
      .getReader(),
    writer: encodeStream.writable.getWriter(),
    piped: encodeStream.readable.pipeTo(adaptSink(options.writable)),
    onRequest: options.onRequest,
    rtspVersion: options.rtspVersion ?? DEFAULT_RTSP_VERSION,
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

/**
 * Wraps the connection's readable side in a stream of this runtime, calling
 * nothing but what {@link OctetSource} names.
 *
 * A read that rejects fails the stream with the same error, the end of the
 * source closes it, and cancelling it cancels the source's reader.
 */
function adaptSource(source: OctetSource): ReadableStream<Uint8Array> {
  const reader = source.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const result = await reader.read();
      if (result.done) {
        controller.close();
      } else {
        controller.enqueue(result.value);
      }
    },
    cancel: (reason) => reader.cancel(reason),
  }, { highWaterMark: SOURCE_QUEUE_CHUNKS });
}

/**
 * Wraps the connection's writable side in a stream of this runtime, calling
 * nothing but what {@link OctetSink} names.
 *
 * Each chunk waits for the sink's writer to take the one before it. A write
 * that rejects fails the stream with the same error.
 */
function adaptSink(sink: OctetSink): WritableStream<Uint8Array> {
  const writer = sink.getWriter();
  return new WritableStream<Uint8Array>({
    write: (chunk) => writer.write(chunk),
    close: () => writer.close(),
    abort: (reason) => writer.abort(reason),
  });
}

/** Writes one item through the one writer, or rejects with the reason the connection ended. */
function writeItem(connection: Connection, item: Item): Promise<void> {
  return connection.ended === undefined
    ? connection.writer.write(item)
    : Promise.reject(connection.ended.reason);
}

/**
 * Sends a copy of `request` under the next `CSeq`, with what it left out
 * filled in, and waits for its final response.
 */
async function sendRequest(
  connection: Connection,
  request: ClientRequest,
): Promise<RtspResponse> {
  const cSeq = connection.nextCSeq++;
  const sent: RtspRequest = {
    method: request.method,
    requestUri: request.requestUri,
    rtspVersion: request.rtspVersion ?? connection.rtspVersion,
    headers: setHeaderField(request.headers ?? [], [C_SEQ, String(cSeq)]),
    messageBody: request.messageBody ?? new Uint8Array(0),
  };

  const pending = Promise.withResolvers<RtspResponse>();
  connection.pendingResponses.set(cSeq, pending);
  try {
    const [response] = await Promise.all([
      pending.promise,
      writeItem(connection, sent),
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
  const cSeq = Number(findHeaderField(response.headers, C_SEQ)?.[1]);
  connection.pendingResponses.get(cSeq)?.resolve(response);
  connection.pendingResponses.delete(cSeq);
}

/** Writes the answer to a request from the server, on a copy that carries the request's `CSeq`. */
async function answerRequest(
  connection: Connection,
  request: RtspRequest,
): Promise<void> {
  const answer = await buildAnswer(connection, request);
  const cSeq = findHeaderField(request.headers, C_SEQ);
  const headers = cSeq === undefined
    ? answer.headers.filter(([name]) => !isSameHeaderName(name, C_SEQ))
    : setHeaderField(answer.headers, cSeq);
  await writeItem(connection, { ...answer, headers });
}

/** Tells whether two header names are the same name, whatever their case. */
function isSameHeaderName(name: string, other: string): boolean {
  return name.toLowerCase() === other.toLowerCase();
}

/** Returns the first pair named `name`, whatever its case, or `undefined`. */
function findHeaderField(
  headerFields: HeaderField[],
  name: string,
): HeaderField | undefined {
  return headerFields.find(([other]) => isSameHeaderName(other, name));
}

/**
 * Returns a copy of `headerFields` in which the header named like `field`,
 * whatever its case, has the value of `field`.
 *
 * The first pair with that name keeps its place and its spelling and gets the
 * value, later pairs with that name are left out. Without such a pair,
 * `field` goes to the end. Neither `headerFields` nor its pairs are changed.
 */
function setHeaderField(
  headerFields: HeaderField[],
  field: HeaderField,
): HeaderField[] {
  const [name, value] = field;
  const first = headerFields.findIndex(([other]) =>
    isSameHeaderName(other, name)
  );
  if (first === -1) {
    return [...headerFields, [name, value]];
  }
  return headerFields.flatMap((other, index): HeaderField[] => {
    if (index === first) {
      return [[other[0], value]];
    }
    return isSameHeaderName(other[0], name) ? [] : [other];
  });
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
    headers: [],
    messageBody: new Uint8Array(0),
  };
}

/**
 * Ends the connection on the caller's wish: lets what was written go out,
 * then closes the writable side and cancels the readable side.
 *
 * The readable is cancelled only after the writable has closed. On a
 * `node:net` socket wrapped with `Duplex.toWeb`, cancelling the readable
 * destroys the socket, and a socket destroyed while its writable is still
 * closing fails the close with an `AbortError`.
 */
async function closeConnection(connection: Connection): Promise<void> {
  if (connection.ended !== undefined) {
    return;
  }
  for (const channel of endConnection(connection, new Error(CLOSED_MESSAGE))) {
    channel.controller.close();
  }
  await Promise.all([connection.writer.close(), connection.piped]);
  await connection.reader.cancel();
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
