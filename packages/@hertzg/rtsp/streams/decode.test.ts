import { test } from "node:test";
import { assertEquals, assertRejects } from "@std/assert";
import { createRtspDecodeStream } from "./decode.ts";

test("createRtspDecodeStream emits the same response for a split at every octet", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 312\r\n" +
      "Content-Type: application/sdp\r\n" +
      "Content-Length: 5\r\n" +
      "\r\n" +
      "v=0\r\n",
  );

  for (let split = 1; split < octets.length; split++) {
    const items = await Array.fromAsync(
      ReadableStream.from([octets.slice(0, split), octets.slice(split)])
        .pipeThrough(createRtspDecodeStream()),
    );

    assertEquals(
      items,
      [{
        rtspVersion: "RTSP/2.0",
        statusCode: 200,
        reasonPhrase: "OK",
        headers: [
          ["CSeq", "312"],
          ["Content-Type", "application/sdp"],
          ["Content-Length", "5"],
        ],
        messageBody: Uint8Array.of(0x76, 0x3d, 0x30, 0x0d, 0x0a),
      }],
      `split at octet ${split}`,
    );
  }
});

test("createRtspDecodeStream emits a request that arrives one octet per chunk", async () => {
  const octets = new TextEncoder().encode(
    "PLAY rtsp://example.com/bar.file RTSP/2.0\r\n" +
      "CSeq: 3\r\n" +
      "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
      "\r\n",
  );

  const items = await Array.fromAsync(
    ReadableStream.from(Array.from(octets, (octet) => Uint8Array.of(octet)))
      .pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [{
    method: "PLAY",
    requestUri: "rtsp://example.com/bar.file",
    rtspVersion: "RTSP/2.0",
    headers: [
      ["CSeq", "3"],
      ["Session", "OccldOFFq23KwjYpAnBbUr"],
    ],
    messageBody: new Uint8Array(0),
  }]);
});

test("createRtspDecodeStream emits a $ block split at every octet", async () => {
  // deno-fmt-ignore
  const octets = new Uint8Array([
    0x24, 0x05, 0x00, 0x03,
    0xaa, 0xbb, 0xcc,
  ]);

  for (let split = 1; split < octets.length; split++) {
    const items = await Array.fromAsync(
      ReadableStream.from([octets.slice(0, split), octets.slice(split)])
        .pipeThrough(createRtspDecodeStream()),
    );

    assertEquals(
      items,
      [{ channelId: 5, binaryData: new Uint8Array([0xaa, 0xbb, 0xcc]) }],
      `split at octet ${split}`,
    );
  }
});

test("createRtspDecodeStream emits a $ block between two messages in order", async () => {
  const setup = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 2\r\n" +
      "Transport: RTP/AVP/TCP;unicast;interleaved=5-6\r\n" +
      "\r\n",
  );
  const block = new Uint8Array([0x24, 0x05, 0x00, 0x02, 0x80, 0x60]);
  const play = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 3\r\n" +
      "Range: npt=0-56.8\r\n" +
      "\r\n",
  );

  const items = await Array.fromAsync(
    ReadableStream.from([setup, block, play])
      .pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [
    {
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [
        ["CSeq", "2"],
        ["Transport", "RTP/AVP/TCP;unicast;interleaved=5-6"],
      ],
      messageBody: new Uint8Array(0),
    },
    { channelId: 5, binaryData: new Uint8Array([0x80, 0x60]) },
    {
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [
        ["CSeq", "3"],
        ["Range", "npt=0-56.8"],
      ],
      messageBody: new Uint8Array(0),
    },
  ]);
});

test("createRtspDecodeStream emits two items that arrive in one chunk", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n" +
      "$\x01\x00\x02AB",
  );

  const items = await Array.fromAsync(
    ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [
    {
      rtspVersion: "RTSP/2.0",
      statusCode: 200,
      reasonPhrase: "OK",
      headers: [["CSeq", "3"]],
      messageBody: new Uint8Array(0),
    },
    { channelId: 1, binaryData: new Uint8Array([0x41, 0x42]) },
  ]);
});

test("createRtspDecodeStream does not read a $ at the start of a message body as a block", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nContent-Length: 4\r\n\r\n$\x00\x00\x00",
  );

  const items = await Array.fromAsync(
    ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [{
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["Content-Length", "4"]],
    messageBody: new Uint8Array([0x24, 0x00, 0x00, 0x00]),
  }]);
});

test("createRtspDecodeStream skips empty lines before a $ block", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n" +
      "\r\n\r\n" +
      "$\x02\x00\x01A",
  );

  const items = await Array.fromAsync(
    ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items[1], {
    channelId: 2,
    binaryData: new Uint8Array([0x41]),
  });
});

test("createRtspDecodeStream skips an empty line split from the $ block after it", async () => {
  const items = await Array.fromAsync(
    ReadableStream.from([
      new Uint8Array([0x0d]),
      new Uint8Array([0x0a, 0x24, 0x02, 0x00, 0x01, 0x41]),
    ]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [{ channelId: 2, binaryData: new Uint8Array([0x41]) }]);
});

test("createRtspDecodeStream skips empty lines before a start-line", async () => {
  const octets = new TextEncoder().encode(
    "\r\n\r\nOPTIONS * RTSP/2.0\r\nCSeq: 1\r\n\r\n",
  );

  const items = await Array.fromAsync(
    ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, [{
    method: "OPTIONS",
    requestUri: "*",
    rtspVersion: "RTSP/2.0",
    headers: [["CSeq", "1"]],
    messageBody: new Uint8Array(0),
  }]);
});

test("createRtspDecodeStream emits items that survive the chunk being overwritten", async () => {
  const chunk = new Uint8Array([0x24, 0x00, 0x00, 0x02, 0x11, 0x22]);
  const stream = createRtspDecodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const read = reader.read();
  await writer.write(chunk);
  chunk.fill(0);
  const { value } = await read;

  assertEquals(value, {
    channelId: 0,
    binaryData: new Uint8Array([0x11, 0x22]),
  });
});

test("createRtspDecodeStream keeps an unread tail that survives the chunk being overwritten", async () => {
  const chunk = new Uint8Array([0x24, 0x00, 0x00, 0x02, 0x11]);
  const stream = createRtspDecodeStream();
  const writer = stream.writable.getWriter();
  const reader = stream.readable.getReader();

  const read = reader.read();
  await writer.write(chunk);
  chunk.fill(0);
  await writer.write(new Uint8Array([0x22]));
  const { value } = await read;

  assertEquals(value, {
    channelId: 0,
    binaryData: new Uint8Array([0x11, 0x22]),
  });
});

test("createRtspDecodeStream ends cleanly on no octets", async () => {
  const items = await Array.fromAsync(
    ReadableStream.from<Uint8Array>([]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items, []);
});

test("createRtspDecodeStream ends cleanly on a tail of empty lines", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n\r\n\r\n",
  );

  const items = await Array.fromAsync(
    ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
  );

  assertEquals(items.length, 1);
});

test("createRtspDecodeStream fails when the stream ends inside a message", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\nContent-Length: 5\r\n\r\nv=0",
  );

  await assertRejects(
    () =>
      Array.fromAsync(
        ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
      ),
    Error,
    "RTSP stream ended inside an item with 50 octets left over",
  );
});

test("createRtspDecodeStream fails when the stream ends inside a $ block", async () => {
  const octets = new Uint8Array([0x24, 0x01, 0x00, 0x03, 0xaa]);

  await assertRejects(
    () =>
      Array.fromAsync(
        ReadableStream.from([octets]).pipeThrough(createRtspDecodeStream()),
      ),
    Error,
    "RTSP stream ended inside an item with 5 octets left over",
  );
});

test("createRtspDecodeStream emits the items before the one the stream ends inside", async () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\nRTSP/2.0 200",
  );
  const reader = ReadableStream.from([octets])
    .pipeThrough(createRtspDecodeStream())
    .getReader();

  const { value } = await reader.read();

  assertEquals(value, {
    rtspVersion: "RTSP/2.0",
    statusCode: 200,
    reasonPhrase: "OK",
    headers: [["CSeq", "3"]],
    messageBody: new Uint8Array(0),
  });
  await assertRejects(
    () => reader.read(),
    Error,
    "RTSP stream ended inside an item with 12 octets left over",
  );
});
