import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { createRtspDecodeStream } from "./decode.ts";
import { createRtspEncodeStream } from "./encode.ts";

test("createRtspEncodeStream writes a request", async () => {
  const chunks = await Array.fromAsync(
    ReadableStream.from([{
      method: "PLAY",
      requestUri: "rtsp://example.com/bar.file",
      rtspVersion: "RTSP/2.0",
      headers: new Headers([
        ["CSeq", "3"],
        ["Session", "OccldOFFq23KwjYpAnBbUr"],
      ]),
      messageBody: new Uint8Array(0),
    }]).pipeThrough(createRtspEncodeStream()),
  );

  assertEquals(chunks.map((chunk) => new TextDecoder().decode(chunk)), [
    "PLAY rtsp://example.com/bar.file RTSP/2.0\r\n" +
    "CSeq: 3\r\n" +
    "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
    "\r\n",
  ]);
});

test("createRtspEncodeStream writes a response with its message body", async () => {
  const chunks = await Array.fromAsync(
    ReadableStream.from([{
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: new Headers([
        ["CSeq", "312"],
        ["Content-Type", "application/sdp"],
      ]),
      messageBody: new TextEncoder().encode("v=0\r\n"),
    }]).pipeThrough(createRtspEncodeStream()),
  );

  assertEquals(chunks.map((chunk) => new TextDecoder().decode(chunk)), [
    "RTSP/2.0 200 OK\r\n" +
    "Content-Length: 5\r\n" +
    "Content-Type: application/sdp\r\n" +
    "CSeq: 312\r\n" +
    "\r\n" +
    "v=0\r\n",
  ]);
});

test("createRtspEncodeStream writes interleaved binary data as a $ block", async () => {
  const chunks = await Array.fromAsync(
    ReadableStream.from([
      { channelId: 5, binaryData: new Uint8Array([0xaa, 0xbb, 0xcc]) },
    ]).pipeThrough(createRtspEncodeStream()),
  );

  // deno-fmt-ignore
  assertEquals(chunks, [new Uint8Array([
    0x24, 0x05, 0x00, 0x03,
    0xaa, 0xbb, 0xcc,
  ])]);
});

test("createRtspEncodeStream writes one chunk per item, in order", async () => {
  const chunks = await Array.fromAsync(
    ReadableStream.from([
      {
        method: "OPTIONS",
        requestUri: "*",
        rtspVersion: "RTSP/2.0",
        headers: new Headers([["CSeq", "1"]]),
        messageBody: new Uint8Array(0),
      },
      { channelId: 0, binaryData: new Uint8Array([0x80]) },
      {
        rtspVersion: "RTSP/2.0",
        statusCode: 200,
        reasonPhrase: "OK",
        headers: new Headers([["CSeq", "7"]]),
        messageBody: new Uint8Array(0),
      },
    ]).pipeThrough(createRtspEncodeStream()),
  );

  assertEquals(chunks, [
    new TextEncoder().encode("OPTIONS * RTSP/2.0\r\nCSeq: 1\r\n\r\n"),
    new Uint8Array([0x24, 0x00, 0x00, 0x01, 0x80]),
    new TextEncoder().encode("RTSP/2.0 200 OK\r\nCSeq: 7\r\n\r\n"),
  ]);
});

test("items round-trip through the encode stream and the decode stream", async () => {
  const items = await Array.fromAsync(
    ReadableStream.from([
      {
        method: "SET_PARAMETER",
        requestUri: "rtsp://example.com/fizzle/foo",
        rtspVersion: "RTSP/2.0",
        headers: new Headers([
          ["CSeq", "421"],
          ["Content-Length", "20"],
          ["Content-Type", "text/parameters"],
        ]),
        messageBody: new TextEncoder().encode("barparam: barstuff\r\n"),
      },
      { channelId: 6, binaryData: new Uint8Array([0x80, 0xc8, 0x00, 0x06]) },
      {
        rtspVersion: "RTSP/1.0",
        statusCode: 100,
        reasonPhrase: "Continue",
        headers: new Headers([["CSeq", "421"]]),
        messageBody: new Uint8Array(0),
      },
    ])
      .pipeThrough(createRtspEncodeStream())
      .pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [
    {
      method: "SET_PARAMETER",
      requestUri: "rtsp://example.com/fizzle/foo",
      rtspVersion: "RTSP/2.0",
      // assertEquals compares Headers in the order the fields were added, and
      // the encoder writes them sorted by name.
      headers: new Headers([
        ["Content-Length", "20"],
        ["Content-Type", "text/parameters"],
        ["CSeq", "421"],
      ]),
      messageBody: new TextEncoder().encode("barparam: barstuff\r\n"),
    },
    { channelId: 6, binaryData: new Uint8Array([0x80, 0xc8, 0x00, 0x06]) },
    {
      rtspVersion: "RTSP/1.0",
      statusCode: 100,
      reasonPhrase: "Continue",
      headers: new Headers([["CSeq", "421"]]),
      messageBody: new Uint8Array(0),
    },
  ]);
});
