/**
 * RTSP messages (RFC 7826 section 5.1): a message is either a request or a
 * response.
 *
 * {@link parseMessage} and {@link serializeMessage} pick the right one of the
 * two, {@link isRequest} and {@link isResponse} tell them apart.
 *
 * @example Parse a frame without knowing what it holds
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isResponse, parseMessage } from "@hertzg/rtsp/protocol/message";
 *
 * const message = parseMessage({
 *   startLine: "RTSP/2.0 200 OK",
 *   headerFields: [["CSeq", "3"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assert(isResponse(message));
 * assertEquals(message.statusCode, 200);
 * ```
 *
 * @module
 */

import type { MessageFrame } from "../encoding/message.ts";
import { parseRequest, type RtspRequest, serializeRequest } from "./request.ts";
import {
  parseResponse,
  type RtspResponse,
  serializeResponse,
} from "./response.ts";

const RTSP_VERSION_PREFIX = "RTSP/";

/** An RTSP message: a request or a response. */
export type RtspMessage = RtspRequest | RtspResponse;

/**
 * Reads a frame as a request or a response.
 *
 * A start-line that begins with `RTSP/` is a Status-Line, so the frame is a
 * response. Any other start-line is a Request-Line.
 *
 * @param frame A frame from `decodeMessage`.
 * @returns The request or the response.
 *
 * @example Parse a request
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 * import { isRequest, parseMessage } from "@hertzg/rtsp/protocol/message";
 *
 * const message = parseMessage({
 *   startLine: "PLAY rtsp://example.com/bar.file RTSP/2.0",
 *   headerFields: [["CSeq", "3"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assert(isRequest(message));
 * assertEquals(message.method, "PLAY");
 * ```
 */
export function parseMessage(frame: MessageFrame): RtspMessage {
  return frame.startLine.startsWith(RTSP_VERSION_PREFIX)
    ? parseResponse(frame)
    : parseRequest(frame);
}

/**
 * Writes a request or a response as a frame, ready for `encodeMessage`.
 *
 * @param message The request or the response to write.
 * @returns The frame.
 *
 * @example Serialize a response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serializeMessage } from "@hertzg/rtsp/protocol/message";
 *
 * const frame = serializeMessage({
 *   rtspVersion: "RTSP/2.0",
 *   statusCode: 200,
 *   reasonPhrase: "OK",
 *   headers: [["CSeq", "3"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(frame.startLine, "RTSP/2.0 200 OK");
 * ```
 */
export function serializeMessage(message: RtspMessage): MessageFrame {
  return isResponse(message)
    ? serializeResponse(message)
    : serializeRequest(message);
}

/**
 * Checks whether a value is a request, by its `method` field.
 *
 * @param value Anything, such as an item read from the decode stream.
 * @returns `true` when the value is a request.
 *
 * @example Tell a request from a response
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isRequest, parseMessage } from "@hertzg/rtsp/protocol/message";
 *
 * const request = parseMessage({
 *   startLine: "OPTIONS * RTSP/2.0",
 *   headerFields: [["CSeq", "1"]],
 *   messageBody: new Uint8Array(0),
 * });
 * const response = parseMessage({
 *   startLine: "RTSP/2.0 200 OK",
 *   headerFields: [["CSeq", "1"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(isRequest(request), true);
 * assertEquals(isRequest(response), false);
 * ```
 */
export function isRequest(value: unknown): value is RtspRequest {
  return typeof value === "object" && value !== null && "method" in value;
}

/**
 * Checks whether a value is a response, by its `statusCode` field.
 *
 * @param value Anything, such as an item read from the decode stream.
 * @returns `true` when the value is a response.
 *
 * @example Tell a response from a request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { isResponse, parseMessage } from "@hertzg/rtsp/protocol/message";
 *
 * const response = parseMessage({
 *   startLine: "RTSP/2.0 200 OK",
 *   headerFields: [["CSeq", "1"]],
 *   messageBody: new Uint8Array(0),
 * });
 * const request = parseMessage({
 *   startLine: "OPTIONS * RTSP/2.0",
 *   headerFields: [["CSeq", "1"]],
 *   messageBody: new Uint8Array(0),
 * });
 *
 * assertEquals(isResponse(response), true);
 * assertEquals(isResponse(request), false);
 * ```
 */
export function isResponse(value: unknown): value is RtspResponse {
  return typeof value === "object" && value !== null && "statusCode" in value;
}
