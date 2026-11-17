import { test } from "node:test";
import { assert, assertEquals } from "@std/assert";
import { createClient } from "./client.ts";
import { isRequest } from "./protocol/message.ts";
import { createRtspDecodeStream } from "./streams/decode.ts";
import { createRtspEncodeStream } from "./streams/encode.ts";

/** Wires a client to an in-memory server speaking real RTSP octets. */
function serverLink() {
  const toServer = new TransformStream<Uint8Array, Uint8Array>();
  const toClient = new TransformStream<Uint8Array, Uint8Array>();
  const encoder = createRtspEncodeStream();
  encoder.readable.pipeTo(toClient.writable).catch(() => {});
  return {
    connection: { readable: toClient.readable, writable: toServer.writable },
    requests: toServer.readable
      .pipeThrough(createRtspDecodeStream())
      .getReader(),
    server: encoder.writable.getWriter(),
  };
}

test("request sends the first request with CSeq 1", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers.get("CSeq"), "1");
});

test("request sends the second request with CSeq 2", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  await requests.read();
  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers.get("CSeq"), "2");
});

test("request overwrites a CSeq the caller set", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers([["CSeq", "99"]]),
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers.get("CSeq"), "1");
});

test("request leaves the caller's Headers unchanged", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);
  const headers = new Headers([["CSeq", "99"]]);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers,
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  assertEquals(headers.get("CSeq"), "99");
});

test("request keeps the caller's other header fields", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: new Headers([["Accept", "application/sdp"]]),
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers.get("Accept"), "application/sdp");
});

test("requests answered out of order each resolve with their own response", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const first = client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  const second = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "2"]]),
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 404,
    reasonPhrase: "Not Found",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals((await first).statusCode, 404);
  assertEquals((await second).statusCode, 200);
});

test("request skips a 1xx response and resolves with the final one", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "SETUP",
    requestUri: "rtsp://example.com/foo/bar/baz.rm",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 100,
    reasonPhrase: "Continue",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).statusCode, 200);
});

test("request ignores a response with an unknown CSeq", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 404,
    reasonPhrase: "Not Found",
    headers: new Headers([["CSeq", "7"]]),
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).statusCode, 200);
});

test("request ignores a response without a CSeq", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 400,
    reasonPhrase: "Bad Request",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).statusCode, 200);
});

test("request still resolves after a server request and a $ block", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "PLAY",
    requestUri: "rtsp://example.com/bar.file",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).statusCode, 200);
});
