import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parseRequest, serializeRequest } from "./request.ts";

test("parseRequest splits the Request-Line of the SETUP request of RFC 7826 section 14", () => {
  const request = parseRequest({
    startLine: "SETUP rtsp://example.com/bar.file RTSP/2.0",
    headerFields: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(request.method, "SETUP");
  assertEquals(request.requestUri, "rtsp://example.com/bar.file");
  assertEquals(request.rtspVersion, "RTSP/2.0");
});

test("parseRequest reads * as the Request-URI", () => {
  const request = parseRequest({
    startLine: "OPTIONS * RTSP/2.0",
    headerFields: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(request.requestUri, "*");
});

test("parseRequest keeps RTSP/1.0 as the version", () => {
  const request = parseRequest({
    startLine: "DESCRIBE rtsp://server.example.com/fizzle/foo RTSP/1.0",
    headerFields: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(request.rtspVersion, "RTSP/1.0");
});

test("parseRequest keeps an unknown method as written", () => {
  const request = parseRequest({
    startLine: "Frobnicate rtsp://example.com/bar.file RTSP/2.0",
    headerFields: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(request.method, "Frobnicate");
});

test("parseRequest passes on the header fields and the message body", () => {
  const request = parseRequest({
    startLine: "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0",
    headerFields: new Headers([["CSeq", "421"]]),
    messageBody: Uint8Array.of(0x62, 0x61, 0x72),
  });

  assertEquals(Array.from(request.headers), [["cseq", "421"]]);
  assertEquals(request.messageBody, Uint8Array.of(0x62, 0x61, 0x72));
});

test("serializeRequest writes the Request-Line", () => {
  const frame = serializeRequest({
    method: "PLAY",
    requestUri: "rtsp://example.com/bar.file",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(frame.startLine, "PLAY rtsp://example.com/bar.file RTSP/2.0");
});

test("serializeRequest writes * as the Request-URI", () => {
  const frame = serializeRequest({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/1.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(frame.startLine, "OPTIONS * RTSP/1.0");
});

test("serializeRequest passes on the header fields and the message body", () => {
  const frame = serializeRequest({
    method: "SET_PARAMETER",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: new Headers([["CSeq", "421"]]),
    messageBody: Uint8Array.of(0x62, 0x61, 0x72),
  });

  assertEquals(Array.from(frame.headerFields), [["cseq", "421"]]);
  assertEquals(frame.messageBody, Uint8Array.of(0x62, 0x61, 0x72));
});

test("serializeRequest output parses back to the same request", () => {
  const request = parseRequest(serializeRequest({
    method: "SETUP",
    requestUri: "rtsp://example.com/bar.file",
    rtspVersion: "RTSP/2.0",
    headers: new Headers([["CSeq", "2"]]),
    messageBody: new Uint8Array(0),
  }));

  assertEquals(request.method, "SETUP");
  assertEquals(request.requestUri, "rtsp://example.com/bar.file");
  assertEquals(request.rtspVersion, "RTSP/2.0");
  assertEquals(Array.from(request.headers), [["cseq", "2"]]);
  assertEquals(request.messageBody, new Uint8Array(0));
});
