import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { parseResponse, serializeResponse } from "./response.ts";

test("parseResponse splits the Status-Line of the SETUP response of RFC 7826 section 14", () => {
  const response = parseResponse({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(response.rtspVersion, "RTSP/2.0");
  assertEquals(response.statusCode, 200);
  assertEquals(response.reasonPhrase, "OK");
});

test("parseResponse reads Status-Code 100", () => {
  const response = parseResponse({
    startLine: "RTSP/2.0 100 Continue",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(response.statusCode, 100);
});

test("parseResponse keeps RTSP/1.0 as the version", () => {
  const response = parseResponse({
    startLine: "RTSP/1.0 200 OK",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(response.rtspVersion, "RTSP/1.0");
});

test("parseResponse keeps the spaces of a Reason-Phrase", () => {
  const response = parseResponse({
    startLine: "RTSP/2.0 453 Not Enough Bandwidth",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(response.reasonPhrase, "Not Enough Bandwidth");
});

test("parseResponse reads an empty Reason-Phrase", () => {
  const response = parseResponse({
    startLine: "RTSP/2.0 200 ",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(response.statusCode, 200);
  assertEquals(response.reasonPhrase, "");
});

test("parseResponse reads a Status-Line that ends at the Status-Code", () => {
  const response = parseResponse({
    startLine: "RTSP/1.0 200",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(response.statusCode, 200);
  assertEquals(response.reasonPhrase, "");
});

test("parseResponse passes on the header fields and the message body", () => {
  const response = parseResponse({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [["CSeq", "312"]],
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(response.headers, [["CSeq", "312"]]);
  assertEquals(response.messageBody, Uint8Array.of(0x76, 0x3d, 0x30));
});

test("serializeResponse writes the Status-Line", () => {
  const frame = serializeResponse({
    rtspVersion: "RTSP/2.0",
    statusCode: 453,
    reasonPhrase: "Not Enough Bandwidth",
    headers: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(frame.startLine, "RTSP/2.0 453 Not Enough Bandwidth");
});

test("serializeResponse keeps the space in front of an empty Reason-Phrase", () => {
  const frame = serializeResponse({
    rtspVersion: "RTSP/1.0",
    statusCode: 200,
    reasonPhrase: "",
    headers: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(frame.startLine, "RTSP/1.0 200 ");
});

test("serializeResponse passes on the header fields and the message body", () => {
  const frame = serializeResponse({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "312"]],
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(frame.headerFields, [["CSeq", "312"]]);
  assertEquals(frame.messageBody, Uint8Array.of(0x76, 0x3d, 0x30));
});

test("serializeResponse output parses back to the same response", () => {
  const response = parseResponse(serializeResponse({
    rtspVersion: "RTSP/2.0",
    statusCode: 100,
    reasonPhrase: "Continue",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  }));

  assertEquals(response.rtspVersion, "RTSP/2.0");
  assertEquals(response.statusCode, 100);
  assertEquals(response.reasonPhrase, "Continue");
  assertEquals(response.headers, [["CSeq", "7"]]);
  assertEquals(response.messageBody, new Uint8Array(0));
});
