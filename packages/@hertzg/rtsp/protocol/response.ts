/**
 * RTSP responses (RFC 7826 section 8): the Status-Line plus the header fields
 * and message body of the frame it came in.
 *
 * @example Parse a response and serialize it again
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import {
 *   parseResponse,
 *   serializeResponse,
 * } from "@hertzg/rtsp/protocol/response";
 *
 * const response = parseResponse({
 *   startLine: "RTSP/2.0 404 Not Found",
 *   headerFields: [["CSeq", "3"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(response.rtspVersion, "RTSP/2.0");
 * assertEquals(response.statusCode, 404);
 * assertEquals(response.reasonPhrase, "Not Found");
 * assertEquals(serializeResponse(response).startLine, "RTSP/2.0 404 Not Found");
 * ```
 *
 * @module
 */

import type { HeaderField, MessageFrame } from "../encoding/message.ts";

/** An RTSP response. */
export type RtspResponse = {
  /** The version, such as `"RTSP/2.0"` or `"RTSP/1.0"`, kept as written. */
  rtspVersion: string;
  /** The Status-Code, such as `200`. A 1xx code is an interim response. */
  statusCode: number;
  /** The text after the Status-Code. It may hold spaces and may be empty. */
  reasonPhrase: string;
  /**
   * The header fields, one pair per line, in the order of the lines and with
   * each name as written. `new Headers(response.headers)` looks a name up
   * whatever its case.
   */
  headers: HeaderField[];
  /** The message body, empty when there is none. */
  messageBody: Uint8Array;
};

/**
 * Reads a frame whose start-line is a Status-Line:
 * `RTSP-Version SP Status-Code SP Reason-Phrase`.
 *
 * Everything after the second space is the Reason-Phrase, spaces included.
 * The header fields and the message body are passed on as they are, not
 * copied.
 *
 * @param frame A frame from `decodeMessage`.
 * @returns The response.
 *
 * @example Parse an interim response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseResponse } from "@hertzg/rtsp/protocol/response";
 *
 * const response = parseResponse({
 *   startLine: "RTSP/2.0 100 Continue",
 *   headerFields: [["CSeq", "7"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(response.rtspVersion, "RTSP/2.0");
 * assertEquals(response.statusCode, 100);
 * assertEquals(response.reasonPhrase, "Continue");
 * assertEquals(response.headers, [["CSeq", "7"]]);
 * ```
 */
export function parseResponse(frame: MessageFrame): RtspResponse {
  const [rtspVersion, statusCode, ...reasonWords] = frame.startLine.split(" ");
  return {
    rtspVersion,
    statusCode: Number(statusCode),
    reasonPhrase: reasonWords.join(" "),
    headers: frame.headerFields,
    messageBody: frame.messageBody,
  };
}

/**
 * Writes a response as a frame, ready for `encodeMessage`.
 *
 * The space after the Status-Code is always written, also in front of an
 * empty Reason-Phrase. The header fields and the message body are passed on
 * as they are, not copied.
 *
 * @param response The response to write.
 * @returns The frame, with the Status-Line as its start-line.
 *
 * @example Serialize a 501 response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeResponse } from "@hertzg/rtsp/protocol/response";
 *
 * const frame = serializeResponse({
 *   rtspVersion: "RTSP/2.0",
 *   statusCode: 501,
 *   reasonPhrase: "Not Implemented",
 *   headers: [["CSeq", "9"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(frame.startLine, "RTSP/2.0 501 Not Implemented");
 * assertEquals(frame.headerFields, [["CSeq", "9"]]);
 * ```
 */
export function serializeResponse(response: RtspResponse): MessageFrame {
  const { rtspVersion, statusCode, reasonPhrase, headers, messageBody } =
    response;
  return {
    startLine: `${rtspVersion} ${statusCode} ${reasonPhrase}`,
    headerFields: headers,
    messageBody,
  };
}
