import { test } from "node:test";
import { assert, assertEquals, assertStrictEquals } from "@std/assert";
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

test("a $ block on an unclaimed channel is dropped and counted", async () => {
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
  await server.write({ channelId: 3, binaryData: new Uint8Array([0x80]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await response;

  assertEquals(client.droppedBlocks.get(3), 1);
});

test("dropped $ blocks are counted per Channel ID", async () => {
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
  await server.write({ channelId: 3, binaryData: new Uint8Array([0x80]) });
  await server.write({ channelId: 5, binaryData: new Uint8Array([0x81]) });
  await server.write({ channelId: 3, binaryData: new Uint8Array([0x82]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await response;

  assertEquals([...client.droppedBlocks], [[3, 2], [5, 1]]);
});

test("a claimed channel reads its $ blocks in order", async () => {
  const { connection, server } = serverLink();
  const client = createClient(connection);
  const reader = client.channel(2).readable.getReader();

  server.write({ channelId: 2, binaryData: new Uint8Array([0x80, 0x01]) });
  server.write({ channelId: 2, binaryData: new Uint8Array([0x80, 0x02]) });
  const first = await reader.read();
  const second = await reader.read();

  assertEquals([first.value, second.value], [
    new Uint8Array([0x80, 0x01]),
    new Uint8Array([0x80, 0x02]),
  ]);
});

test("a claimed channel does not read the $ blocks of another Channel ID", async () => {
  const { connection, server } = serverLink();
  const client = createClient(connection);
  const reader = client.channel(2).readable.getReader();

  server.write({ channelId: 6, binaryData: new Uint8Array([0xc8]) });
  server.write({ channelId: 2, binaryData: new Uint8Array([0x80]) });
  const { value: binaryData } = await reader.read();

  assertEquals(binaryData, new Uint8Array([0x80]));
});

test("a $ block on a claimed channel is not counted as dropped", async () => {
  const { connection, server } = serverLink();
  const client = createClient(connection);
  const reader = client.channel(2).readable.getReader();

  server.write({ channelId: 2, binaryData: new Uint8Array([0x80]) });
  await reader.read();

  assertEquals(client.droppedBlocks.has(2), false);
});

test("channel returns the same pair while the Channel ID is claimed", () => {
  const { connection } = serverLink();
  const client = createClient(connection);

  assertStrictEquals(client.channel(4), client.channel(4));
});

test("a $ block that arrives after the readable is cancelled is counted", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  await client.channel(2).readable.cancel();
  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await server.write({ channelId: 2, binaryData: new Uint8Array([0x80]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await response;

  assertEquals(client.droppedBlocks.get(2), 1);
});

test("a channel claimed again after a cancel reads only later $ blocks", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  await client.channel(2).readable.cancel();
  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await server.write({ channelId: 2, binaryData: new Uint8Array([0x01]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await response;

  const reader = client.channel(2).readable.getReader();
  server.write({ channelId: 2, binaryData: new Uint8Array([0x02]) });
  const { value: binaryData } = await reader.read();

  assertEquals(binaryData, new Uint8Array([0x02]));
});

test("cancelling the readable lets a held-back response through", async () => {
  // The control client gets more traffic, later, over a link of the same
  // depth. Once its response is in, the held client has had the time to
  // queue its $ block and is waiting for the channel's reader.
  const held = serverLink();
  const heldClient = createClient(held.connection);
  const channel = heldClient.channel(0);
  const control = serverLink();
  const controlClient = createClient(control.connection);

  const heldResponse = heldClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  held.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await controlResponse;
  await channel.readable.cancel();

  assertEquals((await heldResponse).statusCode, 200);
});

test("writing to a channel sends a $ block with its Channel ID", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);
  const writer = client.channel(1).writable.getWriter();

  const written = writer.write(new Uint8Array([0xca, 0xfe]));
  const { value: sent } = await requests.read();
  await written;

  assertEquals(sent, {
    channelId: 1,
    binaryData: new Uint8Array([0xca, 0xfe]),
  });
});

test("closing a channel's writable leaves the connection open for requests", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  await client.channel(1).writable.close();
  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.method, "OPTIONS");
});

test("an unread $ block on a claimed channel holds back the next response", async () => {
  // The held client and the control client get the same traffic over links
  // of the same depth. The held one is written first and has less to handle,
  // so it can only lose the race by waiting for its channel's reader.
  const held = serverLink();
  const heldClient = createClient(held.connection);
  heldClient.channel(0);
  const control = serverLink();
  const controlClient = createClient(control.connection);

  const heldResponse = heldClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  held.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });

  const winner = await Promise.race([
    heldResponse.then(() => "held"),
    controlResponse.then(() => "control"),
  ]);

  assertEquals(winner, "control");
});

test("reading the $ block lets the held-back response through", async () => {
  // The control client gets more traffic, later, over a link of the same
  // depth. Once its response is in, the held client has had the time to
  // queue its $ block and is waiting for the channel's reader.
  const held = serverLink();
  const heldClient = createClient(held.connection);
  const channel = heldClient.channel(0);
  const control = serverLink();
  const controlClient = createClient(control.connection);

  const heldResponse = heldClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: new Headers(),
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  held.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: new Headers([["CSeq", "1"]]),
    messageBody: new Uint8Array(0),
  });
  await controlResponse;
  await channel.readable.getReader().read();

  assertEquals((await heldResponse).statusCode, 200);
});
