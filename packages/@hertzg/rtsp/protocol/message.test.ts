import { test } from "node:test";
import { assertEquals } from "@std/assert";
import {
  isRequest,
  isResponse,
  parseMessage,
  serializeMessage,
} from "./message.ts";

test("parseMessage reads a start-line beginning with RTSP/ as a response", () => {
  const message = parseMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: new Headers([["CSeq", "3"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals(message, {
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "3"]]),
    messageBody: new Uint8Array(0),
  });
});

test("parseMessage reads an RTSP/1.0 Status-Line as a response", () => {
  const message = parseMessage({
    startLine: "RTSP/1.0 100 Continue",
    headerFields: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(isResponse(message), true);
});

test("parseMessage reads any other start-line as a request", () => {
  const message = parseMessage({
    startLine: "PLAY rtsp://example.com/bar.file RTSP/2.0",
    headerFields: new Headers([["CSeq", "3"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals(message, {
    method: "PLAY",
    requestUri: "rtsp://example.com/bar.file",
    rtspVersion: "RTSP/2.0",
    headers: new Headers([["CSeq", "3"]]),
    messageBody: new Uint8Array(0),
  });
});

test("serializeMessage writes a response with a Status-Line", () => {
  const frame = serializeMessage({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
});

test("serializeMessage writes a request with a Request-Line", () => {
  const frame = serializeMessage({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(frame.startLine, "OPTIONS * RTSP/2.0");
});

test("isRequest is true for a request only", () => {
  assertEquals(
    isRequest({
      method: "OPTIONS",
      requestUri: "*",
      rtspVersion: "RTSP/2.0",
      headers: new Headers(),
      messageBody: new Uint8Array(0),
    }),
    true,
  );
  assertEquals(
    isRequest({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: new Headers(),
      messageBody: new Uint8Array(0),
    }),
    false,
  );
  assertEquals(
    isRequest({ channelId: 5, binaryData: new Uint8Array(0) }),
    false,
  );
  assertEquals(isRequest(null), false);
  assertEquals(isRequest(undefined), false);
  assertEquals(isRequest("OPTIONS * RTSP/2.0"), false);
});

test("isResponse is true for a response only", () => {
  assertEquals(
    isResponse({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: new Headers(),
      messageBody: new Uint8Array(0),
    }),
    true,
  );
  assertEquals(
    isResponse({
      method: "OPTIONS",
      requestUri: "*",
      rtspVersion: "RTSP/2.0",
      headers: new Headers(),
      messageBody: new Uint8Array(0),
    }),
    false,
  );
  assertEquals(
    isResponse({ channelId: 5, binaryData: new Uint8Array(0) }),
    false,
  );
  assertEquals(isResponse(null), false);
  assertEquals(isResponse(undefined), false);
  assertEquals(isResponse("RTSP/2.0 200 OK"), false);
});
