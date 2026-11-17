/**
 * An RTSP connection over any `{ readable, writable }` byte pair. Terminology
 * follows RFC 7826 (RTSP 2.0); the message syntax is the same for `RTSP/1.0`,
 * which is what cameras speak, so the version is just a field.
 *
 * ```
 * TCP octets
 *    |
 * streams/decode    TransformStream<Uint8Array, RtspMessage | InterleavedBinaryData>
 *    |
 * client read loop
 *    |-- RtspResponse           -> resolves request() by CSeq
 *    |-- RtspRequest            -> onRequest handler, answer written back
 *    '-- InterleavedBinaryData  -> channel(channelId), or dropped and counted
 * ```
 *
 * The client carries messages and `$` blocks, nothing more. It keeps no RTSP
 * session state, does not parse the `Transport` header or SDP, and does not
 * authenticate. It does not open the socket either: the caller passes the two
 * sides of a connection it already has. Any pair with `getReader()` and
 * `getWriter()` will do (`OctetSource` and `OctetSink`), so the web streams
 * of this runtime and what `Duplex.toWeb(socket)` returns both go in as they
 * are.
 *
 * A request names its method and its Request-URI. The rest may be left out:
 * the version is `RTSP/1.0` unless the request or the client's `rtspVersion`
 * option says otherwise, and there are no header fields besides `CSeq` and no
 * message body.
 *
 * The `headers` of a message are `[name, value]` pairs, one per header line,
 * in the order of the lines and with each name as written. What the caller
 * passes goes out in that order and that spelling, and what a camera sends
 * comes back the same way. `new Headers(response.headers)` looks a name up
 * whatever its case.
 *
 * Every layer is its own entry point: `encoding/interleaved`,
 * `encoding/message`, `protocol/request`, `protocol/response`,
 * `protocol/message`, `streams/decode`, `streams/encode` and `client`.
 *
 * @example Send a request and read its response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { createClient } from "@hertzg/rtsp";
 *
 * const toServer = new TransformStream<Uint8Array, Uint8Array>();
 * const toClient = new TransformStream<Uint8Array, Uint8Array>();
 * const client = createClient({
 *   readable: toClient.readable,
 *   writable: toServer.writable,
 * });
 *
 * const response = client.request({ method: "OPTIONS", requestUri: "*" });
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
 * @example Describe a camera stream over a TCP socket
 * ```ts ignore
 * import { connect } from "node:net";
 * import { Duplex } from "node:stream";
 * import { createClient } from "@hertzg/rtsp";
 *
 * const socket = connect({ host: "192.0.2.10", port: 554 });
 * const client = createClient(Duplex.toWeb(socket));
 *
 * const response = await client.request({
 *   method: "DESCRIBE",
 *   requestUri: "rtsp://192.0.2.10/stream1",
 *   headers: [["Accept", "application/sdp"]],
 * });
 * const sdp = new TextDecoder().decode(response.messageBody);
 *
 * await client.close();
 * ```
 *
 * @module
 */

export { createClient } from "./client.ts";
export type {
  Client,
  ClientOptions,
  ClientRequest,
  OctetReader,
  OctetSink,
  OctetSource,
  OctetWriter,
} from "./client.ts";
export {
  decodeInterleavedBinaryData,
  encodeInterleavedBinaryData,
  isInterleavedBinaryData,
} from "./encoding/interleaved.ts";
export type { InterleavedBinaryData } from "./encoding/interleaved.ts";
export { decodeMessage, encodeMessage } from "./encoding/message.ts";
export type { HeaderField, MessageFrame } from "./encoding/message.ts";
export {
  isRequest,
  isResponse,
  parseMessage,
  serializeMessage,
} from "./protocol/message.ts";
export type { RtspMessage } from "./protocol/message.ts";
export { parseRequest, serializeRequest } from "./protocol/request.ts";
export type { RtspRequest } from "./protocol/request.ts";
export { parseResponse, serializeResponse } from "./protocol/response.ts";
export type { RtspResponse } from "./protocol/response.ts";
export { createRtspDecodeStream } from "./streams/decode.ts";
export { createRtspEncodeStream } from "./streams/encode.ts";
