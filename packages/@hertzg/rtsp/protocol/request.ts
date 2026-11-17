/**
 * RTSP requests (RFC 7826 section 7): the Request-Line plus the header fields
 * and message body of the frame it came in.
 *
 * @example Parse a request and serialize it again
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseRequest, serializeRequest } from "@hertzg/rtsp/protocol/request";
 *
 * const request = parseRequest({
 *   startLine: "PLAY rtsp://example.com/bar.file RTSP/2.0",
 *   headerFields: new Headers({ "CSeq": "3" }),
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(request.method, "PLAY");
 * assertEquals(request.requestUri, "rtsp://example.com/bar.file");
 * assertEquals(request.rtspVersion, "RTSP/2.0");
 * assertEquals(
 *   serializeRequest(request).startLine,
 *   "PLAY rtsp://example.com/bar.file RTSP/2.0",
 * );
 * ```
 *
 * @module
 */

import type { MessageFrame } from "../encoding/message.ts";

/** An RTSP request. */
export type RtspRequest = {
  /** The method, such as `"DESCRIBE"`, kept as written. */
  method: string;
  /** `"*"` or an RTSP URI. */
  requestUri: string;
  /** The version, such as `"RTSP/2.0"` or `"RTSP/1.0"`, kept as written. */
  rtspVersion: string;
  /** The header fields. */
  headers: Headers;
  /** The message body, empty when there is none. */
  messageBody: Uint8Array;
};

/**
 * Reads a frame whose start-line is a Request-Line:
 * `Method SP Request-URI SP RTSP-Version`.
 *
 * The header fields and the message body are passed on as they are, not
 * copied.
 *
 * @param frame A frame from `decodeMessage`.
 * @returns The request.
 *
 * @example Parse a request for the server itself
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseRequest } from "@hertzg/rtsp/protocol/request";
 *
 * const request = parseRequest({
 *   startLine: "OPTIONS * RTSP/2.0",
 *   headerFields: new Headers({ "CSeq": "1" }),
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(request.method, "OPTIONS");
 * assertEquals(request.requestUri, "*");
 * assertEquals(request.rtspVersion, "RTSP/2.0");
 * assertEquals(request.headers.get("CSeq"), "1");
 * ```
 */
export function parseRequest(frame: MessageFrame): RtspRequest {
  const [method, requestUri, rtspVersion] = frame.startLine.split(" ");
  return {
    method,
    requestUri,
    rtspVersion,
    headers: frame.headerFields,
    messageBody: frame.messageBody,
  };
}

/**
 * Writes a request as a frame, ready for `encodeMessage`.
 *
 * The header fields and the message body are passed on as they are, not
 * copied.
 *
 * @param request The request to write.
 * @returns The frame, with the Request-Line as its start-line.
 *
 * @example Serialize a DESCRIBE request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeRequest } from "@hertzg/rtsp/protocol/request";
 *
 * const frame = serializeRequest({
 *   method: "DESCRIBE",
 *   requestUri: "rtsp://server.example.com/fizzle/foo",
 *   rtspVersion: "RTSP/2.0",
 *   headers: new Headers({ "Accept": "application/sdp" }),
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(
 *   frame.startLine,
 *   "DESCRIBE rtsp://server.example.com/fizzle/foo RTSP/2.0",
 * );
 * assertEquals(frame.headerFields.get("Accept"), "application/sdp");
 * ```
 */
export function serializeRequest(request: RtspRequest): MessageFrame {
  const { method, requestUri, rtspVersion, headers, messageBody } = request;
  return {
    startLine: `${method} ${requestUri} ${rtspVersion}`,
    headerFields: headers,
    messageBody,
  };
}
