import { test } from "node:test";
import {
  assert,
  assertEquals,
  assertRejects,
  assertStrictEquals,
} from "@std/assert";
import {
  assertSpyCall,
  assertSpyCallArg,
  assertSpyCalls,
  spy,
} from "@std/testing/mock";
import { createClient } from "./client.ts";
import { isRequest, isResponse } from "./protocol/message.ts";
import type { RtspRequest } from "./protocol/request.ts";
import type { RtspResponse } from "./protocol/response.ts";
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
    headers: [],
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [["CSeq", "1"]]);
});

test("request sends the second request with CSeq 2", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });

  await requests.read();
  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [["CSeq", "2"]]);
});

test("request overwrites a CSeq the caller set", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "99"]],
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [["CSeq", "1"]]);
});

test("request keeps the place and the spelling of a CSeq the caller set", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [
      ["User-Agent", "PhonyClient/1.2"],
      ["cSEQ", "99"],
      ["Accept", "application/sdp"],
    ],
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [
    ["User-Agent", "PhonyClient/1.2"],
    ["cSEQ", "1"],
    ["Accept", "application/sdp"],
  ]);
});

test("request drops a second CSeq the caller set in another spelling", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [
      ["cSEQ", "99"],
      ["User-Agent", "PhonyClient/1.2"],
      ["CSeq", "98"],
    ],
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [
    ["cSEQ", "1"],
    ["User-Agent", "PhonyClient/1.2"],
  ]);
});

test("request appends CSeq after the caller's header fields when they hold none", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [
      ["User-Agent", "PhonyClient/1.2"],
      ["Accept", "application/sdp"],
    ],
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [
    ["User-Agent", "PhonyClient/1.2"],
    ["Accept", "application/sdp"],
    ["CSeq", "1"],
  ]);
});

test("request leaves the caller's headers unchanged", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);
  const headers: [string, string][] = [
    ["cSEQ", "99"],
    ["Accept", "application/sdp"],
    ["CSeq", "98"],
  ];

  client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers,
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  assertEquals(headers, [
    ["cSEQ", "99"],
    ["Accept", "application/sdp"],
    ["CSeq", "98"],
  ]);
});

test("request sends the caller's header fields in their order and spelling", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [
      ["user-AGENT", "PhonyClient/1.2"],
      ["ACCEPT", "application/sdp"],
      ["Accept", "application/rtsl"],
    ],
    messageBody: new Uint8Array(0),
  });

  const { value: sent } = await requests.read();
  assert(isRequest(sent));
  assertEquals(sent.headers, [
    ["user-AGENT", "PhonyClient/1.2"],
    ["ACCEPT", "application/sdp"],
    ["Accept", "application/rtsl"],
    ["CSeq", "1"],
  ]);
});

test("request resolves with a response whose CSeq is spelled cseq", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/1.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/1.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["cseq", "1"]],
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).statusCode, 200);
});

test("request resolves with the header fields as the server wrote them", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/1.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/1.0",
    statusCode: 401,
    reasonPhrase: "Unauthorized",
    headers: [
      ["WWW-Authenticate", 'Digest realm="camera", nonce="abc123"'],
      ["cseq", "1"],
      ["WWW-Authenticate", 'Basic realm="camera"'],
    ],
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).headers, [
    ["WWW-Authenticate", 'Digest realm="camera", nonce="abc123"'],
    ["cseq", "1"],
    ["WWW-Authenticate", 'Basic realm="camera"'],
  ]);
});

test("requests answered out of order each resolve with their own response", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const first = client.request({
    method: "DESCRIBE",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  const second = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "2"]],
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 404,
    reasonPhrase: "Not Found",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 100,
    reasonPhrase: "Continue",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 404,
    reasonPhrase: "Not Found",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 400,
    reasonPhrase: "Bad Request",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  await server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await server.write({ channelId: 3, binaryData: new Uint8Array([0x80]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
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
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await server.write({ channelId: 2, binaryData: new Uint8Array([0x80]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await server.write({ channelId: 2, binaryData: new Uint8Array([0x01]) });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  held.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  held.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
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
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  held.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  await controlResponse;
  await channel.readable.getReader().read();

  assertEquals((await heldResponse).statusCode, 200);
});

test("onRequest is called with the request the server sent", async () => {
  const { connection, requests, server } = serverLink();
  const onRequest = spy((request: RtspRequest) => ({
    rtspVersion: request.rtspVersion,
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [],
    messageBody: new Uint8Array(0),
  }));
  createClient({ ...connection, onRequest });

  await server.write({
    method: "TEARDOWN",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  assertSpyCallArg(onRequest, 0, 0, {
    method: "TEARDOWN",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });
});

test("the answer from onRequest is sent to the server", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 454,
      reasonPhrase: "Session Not Found",
      headers: [],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "TEARDOWN",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.statusCode, 454);
});

test("the answer from onRequest carries the request's CSeq", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [["CSeq", "7"]]);
});

test("the request's CSeq overwrites a CSeq that onRequest set", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [["CSeq", "99"]],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [["CSeq", "7"]]);
});

test("the request's CSeq keeps the place and the spelling of a CSeq that onRequest set", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [
        ["Server", "PhonyServer/1.1"],
        ["cSEQ", "99"],
        ["Public", "OPTIONS"],
      ],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSEQ", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [
    ["Server", "PhonyServer/1.1"],
    ["cSEQ", "7"],
    ["Public", "OPTIONS"],
  ]);
});

test("a second CSeq that onRequest set in another spelling is dropped", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [
        ["cSEQ", "99"],
        ["Public", "OPTIONS"],
        ["CSeq", "98"],
      ],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [
    ["cSEQ", "7"],
    ["Public", "OPTIONS"],
  ]);
});

test("the answer's CSeq is appended in the spelling the server used", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [["Public", "OPTIONS"]],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["cseq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [
    ["Public", "OPTIONS"],
    ["cseq", "7"],
  ]);
});

test("the answer to a request without a CSeq loses every CSeq that onRequest set", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [
        ["cSEQ", "99"],
        ["Public", "OPTIONS"],
        ["CSeq", "98"],
      ],
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [["Public", "OPTIONS"]]);
});

test("the headers of the answer from onRequest are left unchanged", async () => {
  const { connection, requests, server } = serverLink();
  const headers: [string, string][] = [
    ["cSEQ", "99"],
    ["Public", "OPTIONS"],
    ["CSeq", "98"],
  ];
  createClient({
    ...connection,
    onRequest: () => ({
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers,
      messageBody: new Uint8Array(0),
    }),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });
  await requests.read();

  assertEquals(headers, [
    ["cSEQ", "99"],
    ["Public", "OPTIONS"],
    ["CSeq", "98"],
  ]);
});

test("a server request is answered 501 when there is no onRequest", async () => {
  const { connection, requests, server } = serverLink();
  createClient(connection);

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.statusCode, 501);
});

test("the 501 answer carries the request's CSeq", async () => {
  const { connection, requests, server } = serverLink();
  createClient(connection);

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [["CSeq", "7"]]);
});

test("the 501 answer uses the request's RTSP version", async () => {
  const { connection, requests, server } = serverLink();
  createClient(connection);

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/1.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.rtspVersion, "RTSP/1.0");
});

test("a server request is answered 500 when onRequest rejects", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => Promise.reject(new Error("handler broke")),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.statusCode, 500);
});

test("a server request is answered 500 when onRequest throws", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => {
      throw new Error("handler broke");
    },
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.statusCode, 500);
});

test("the 500 answer carries the request's CSeq", async () => {
  const { connection, requests, server } = serverLink();
  createClient({
    ...connection,
    onRequest: () => Promise.reject(new Error("handler broke")),
  });

  await server.write({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });

  const { value: answer } = await requests.read();
  assert(isResponse(answer));
  assertEquals(answer.headers, [["CSeq", "7"]]);
});

test("an onRequest that has not answered yet does not hold back a response", async () => {
  const { connection, requests, server } = serverLink();
  const answer = Promise.withResolvers<RtspResponse>();
  const client = createClient({
    ...connection,
    onRequest: () => answer.promise,
  });

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  await server.write({
    method: "TEARDOWN",
    requestUri: "rtsp://example.com/fizzle/foo",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "7"]],
    messageBody: new Uint8Array(0),
  });
  await server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });

  assertEquals((await response).statusCode, 200);
});

test("close rejects a request that is waiting for its response", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  const closed = client.close();

  await assertRejects(() => response, Error, "RTSP client is closed");
  await closed;
});

test("close closes the readable of a claimed channel", async () => {
  const { connection } = serverLink();
  const client = createClient(connection);
  const reader = client.channel(0).readable.getReader();

  await client.close();
  const { done } = await reader.read();

  assertEquals(done, true);
});

test("close rejects a request while an unread $ block holds the connection back", async () => {
  // The control client gets more traffic, later, over a link of the same
  // depth. Once its response is in, the held client has had the time to
  // queue its $ block and is waiting for the channel's reader.
  const held = serverLink();
  const heldClient = createClient(held.connection);
  heldClient.channel(0);
  const control = serverLink();
  const controlClient = createClient(control.connection);

  const heldResponse = heldClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await held.requests.read();
  const controlResponse = controlClient.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await control.requests.read();

  const heldWrites = Promise.allSettled([
    held.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) }),
    held.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) }),
  ]);
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x80]) });
  control.server.write({ channelId: 0, binaryData: new Uint8Array([0x81]) });
  control.server.write({
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  });
  await controlResponse;
  const closed = heldClient.close();

  await assertRejects(() => heldResponse, Error, "RTSP client is closed");
  await closed;
  await heldWrites;
});

test("close closes the connection's writable", async () => {
  const { connection, requests } = serverLink();
  const client = createClient(connection);

  await client.close();
  const { done } = await requests.read();

  assertEquals(done, true);
});

test("close cancels the connection's readable", async () => {
  const cancel = spy();
  const client = createClient({
    readable: new ReadableStream<Uint8Array>({ cancel }),
    writable: new WritableStream<Uint8Array>(),
  });

  await client.close();

  assertSpyCalls(cancel, 1);
});

test("close cancels the readable only after the writable has closed", async () => {
  const finishClosing = spy();
  const countFinishedCloses = spy(() => finishClosing.calls.length);
  const client = createClient({
    readable: new ReadableStream<Uint8Array>({
      cancel() {
        countFinishedCloses();
      },
    }),
    writable: new WritableStream<Uint8Array>({
      // A socket takes a turn of the event loop to close, not a microtask.
      close: () =>
        new Promise<void>((resolve) => setTimeout(resolve)).then(finishClosing),
    }),
  });

  await client.close();

  assertSpyCall(countFinishedCloses, 0, { returned: 1 });
});

test("a second close resolves", async () => {
  const { connection } = serverLink();
  const client = createClient(connection);

  await client.close();

  assertEquals(await client.close(), undefined);
});

test("request rejects after close", async () => {
  const { connection } = serverLink();
  const client = createClient(connection);

  await client.close();

  await assertRejects(
    () =>
      client.request({
        method: "OPTIONS",
        requestUri: "*",
        rtspVersion: "RTSP/2.0",
        headers: [],
        messageBody: new Uint8Array(0),
      }),
    Error,
    "RTSP client is closed",
  );
});

test("a channel claimed after close has a failed readable", async () => {
  const { connection } = serverLink();
  const client = createClient(connection);

  await client.close();

  await assertRejects(
    () => client.channel(0).readable.getReader().read(),
    Error,
    "RTSP client is closed",
  );
});

test("writing to a channel rejects after close", async () => {
  const { connection } = serverLink();
  const client = createClient(connection);
  const writer = client.channel(0).writable.getWriter();

  await client.close();

  await assertRejects(
    () => writer.write(new Uint8Array([0x80])),
    Error,
    "RTSP client is closed",
  );
});

test("a read error rejects a waiting request with the same error", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);
  const cause = new Error("connection reset");

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  const outcome = response.catch((error) => error);
  await server.abort(cause);

  assertStrictEquals(await outcome, cause);
});

test("a read error fails the readable of a claimed channel with the same error", async () => {
  const { connection, server } = serverLink();
  const client = createClient(connection);
  const cause = new Error("connection reset");
  const reader = client.channel(0).readable.getReader();

  const outcome = reader.read().catch((error) => error);
  await server.abort(cause);

  assertStrictEquals(await outcome, cause);
});

test("request rejects with the same error after a read error", async () => {
  const { connection, server } = serverLink();
  const client = createClient(connection);
  const cause = new Error("connection reset");
  const reader = client.channel(0).readable.getReader();

  const failed = reader.read().catch((error) => error);
  await server.abort(cause);
  await failed;
  const outcome = await client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  }).catch((error) => error);

  assertStrictEquals(outcome, cause);
});

test("the server ending the connection rejects a waiting request", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  const rejected = assertRejects(
    () => response,
    Error,
    "RTSP connection ended",
  );
  await server.close();

  await rejected;
});

test("the server ending the connection fails a claimed channel with the error the request got", async () => {
  const { connection, requests, server } = serverLink();
  const client = createClient(connection);
  const reader = client.channel(0).readable.getReader();

  const response = client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  });
  await requests.read();
  const requestOutcome = response.catch((error) => error);
  const channelOutcome = reader.read().catch((error) => error);
  await server.close();

  assertStrictEquals(await channelOutcome, await requestOutcome);
});

test("a write error rejects a request that was already written", async () => {
  const cause = new Error("broken pipe");
  const client = createClient({
    readable: new ReadableStream<Uint8Array>(),
    writable: new WritableStream<Uint8Array>({
      write() {
        throw cause;
      },
    }),
  });

  const outcome = await client.request({
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [],
    messageBody: new Uint8Array(0),
  }).catch((error) => error);

  assertStrictEquals(outcome, cause);
});

test("a write error fails the readable of a claimed channel with the same error", async () => {
  const cause = new Error("broken pipe");
  const client = createClient({
    readable: new ReadableStream<Uint8Array>(),
    writable: new WritableStream<Uint8Array>({
      write() {
        throw cause;
      },
    }),
  });
  const channel = client.channel(0);

  const outcome = channel.readable.getReader().read().catch((error) => error);
  await channel.writable.getWriter().write(new Uint8Array([0x80])).catch(
    () => {},
  );

  assertStrictEquals(await outcome, cause);
});
