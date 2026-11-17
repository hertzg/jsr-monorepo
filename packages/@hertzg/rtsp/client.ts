/**
 * An RTSP client over any `{ readable, writable }` byte pair.
 *
 * {@link createClient} does not open a socket: the caller passes the two
 * sides of a connection it already has. Requests are numbered with `CSeq` and
 * each one resolves with the response that carries the same number, so
 * several can be on the wire at once.
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

import type { InterleavedBinaryData } from "./encoding/interleaved.ts";
import { isResponse, type RtspMessage } from "./protocol/message.ts";
import type { RtspRequest } from "./protocol/request.ts";
import type { RtspResponse } from "./protocol/response.ts";
import { createRtspDecodeStream } from "./streams/decode.ts";
import { createRtspEncodeStream } from "./streams/encode.ts";

const FIRST_C_SEQ = 1;

/** Status-Codes below this one are 1xx: interim, with a final response to follow. */
const FIRST_FINAL_STATUS_CODE = 200;

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
 */
export function createClient(options: ClientOptions): Client {
  const encodeStream = createRtspEncodeStream();
  const connection: Connection = {
    reader: options.readable.pipeThrough(createRtspDecodeStream()).getReader(),
    writer: encodeStream.writable.getWriter(),
    pendingResponses: new Map(),
    nextCSeq: FIRST_C_SEQ,
  };

  // A failed pipe also fails the writer, so the next write in sendRequest
  // rejects with the same error.
  encodeStream.readable.pipeTo(options.writable).catch(() => {});
  runReadLoop(connection).catch(() => {});

  return {
    request: (request) => sendRequest(connection, request),
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

/** Hands every item the server sends to {@link handleItem}, until the connection ends. */
async function runReadLoop(connection: Connection): Promise<void> {
  for (
    let result = await connection.reader.read();
    !result.done;
    result = await connection.reader.read()
  ) {
    handleItem(connection, result.value);
  }
}

/** Routes one item from the server. Requests and `$` blocks are ignored. */
function handleItem(connection: Connection, item: Item): void {
  if (isResponse(item)) {
    handleResponse(connection, item);
  }
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
