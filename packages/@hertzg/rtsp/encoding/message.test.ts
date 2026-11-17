import { test } from "node:test";
import { assertEquals, assertNotStrictEquals } from "@std/assert";
import { decodeMessage, encodeMessage } from "./message.ts";

test("decodeMessage reads the SETUP request of RFC 7826 section 14", () => {
  const octets = new TextEncoder().encode(
    "SETUP rtsp://example.com/bar.file RTSP/2.0\r\n" +
      "CSeq: 2\r\n" +
      "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\n" +
      "Accept-Ranges: npt, smpte, clock\r\n" +
      "User-Agent: PhonyClient/1.2\r\n" +
      "\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "SETUP rtsp://example.com/bar.file RTSP/2.0");
  assertEquals(frame.headerFields, [
    ["CSeq", "2"],
    ["Transport", "RTP/AVP/TCP;unicast;interleaved=0-1"],
    ["Accept-Ranges", "npt, smpte, clock"],
    ["User-Agent", "PhonyClient/1.2"],
  ]);
  assertEquals(frame.messageBody, new Uint8Array(0));
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage reads the SETUP response of RFC 7826 section 14", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 2\r\n" +
      "Date: Thu, 05 Jun 1997 18:57:18 GMT\r\n" +
      "Transport: RTP/AVP/TCP;unicast;interleaved=5-6\r\n" +
      "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
      "Accept-Ranges: npt\r\n" +
      "Media-Properties: Random-Access=0.2, Immutable, Unlimited\r\n" +
      "\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
  assertEquals(frame.headerFields, [
    ["CSeq", "2"],
    ["Date", "Thu, 05 Jun 1997 18:57:18 GMT"],
    ["Transport", "RTP/AVP/TCP;unicast;interleaved=5-6"],
    ["Session", "OccldOFFq23KwjYpAnBbUr"],
    ["Accept-Ranges", "npt"],
    ["Media-Properties", "Random-Access=0.2, Immutable, Unlimited"],
  ]);
  assertEquals(frame.messageBody, new Uint8Array(0));
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage reads the PLAY request of RFC 7826 section 14", () => {
  const octets = new TextEncoder().encode(
    "PLAY rtsp://example.com/bar.file RTSP/2.0\r\n" +
      "CSeq: 3\r\n" +
      "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
      "User-Agent: PhonyClient/1.2\r\n" +
      "\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "PLAY rtsp://example.com/bar.file RTSP/2.0");
  assertEquals(frame.headerFields, [
    ["CSeq", "3"],
    ["Session", "OccldOFFq23KwjYpAnBbUr"],
    ["User-Agent", "PhonyClient/1.2"],
  ]);
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage unfolds the RTP-Info of the PLAY response of RFC 7826 section 14 to one space", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 3\r\n" +
      "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
      "Date: Thu, 05 Jun 1997 18:57:19 GMT\r\n" +
      'RTP-Info: url="rtsp://example.com/bar.file"\r\n' +
      "  ssrc=0D12F123:seq=232433;rtptime=972948234\r\n" +
      "Range: npt=0-56.8\r\n" +
      "Seek-Style: RAP\r\n" +
      "\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [
    ["CSeq", "3"],
    ["Session", "OccldOFFq23KwjYpAnBbUr"],
    ["Date", "Thu, 05 Jun 1997 18:57:19 GMT"],
    [
      "RTP-Info",
      'url="rtsp://example.com/bar.file" ssrc=0D12F123:seq=232433;rtptime=972948234',
    ],
    ["Range", "npt=0-56.8"],
    ["Seek-Style", "RAP"],
  ]);
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage unfolds a value folded with a tab", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "Public: OPTIONS,\r\n" +
      "\tDESCRIBE\r\n" +
      "\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [["Public", "OPTIONS, DESCRIBE"]]);
});

test("decodeMessage reads the DESCRIBE response of RFC 7826 section 13.2 with its SDP body", () => {
  // The RFC prints Content-Length: 358, but the body it prints is 345 octets
  // with CRLF line ends. The fixture carries the real length.
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 312\r\n" +
      "Date: Thu, 23 Jan 1997 15:35:06 GMT\r\n" +
      "Server: PhonyServer/1.1\r\n" +
      "Content-Base: rtsp://server.example.com/fizzle/foo/\r\n" +
      "Content-Type: application/sdp\r\n" +
      "Content-Length: 345\r\n" +
      "\r\n" +
      "v=0\r\n" +
      "o=MNobody 2890844526 2890842807 IN IP4 192.0.2.46\r\n" +
      "s=SDP Seminar\r\n" +
      "i=A Seminar on the session description protocol\r\n" +
      "u=http://www.example.com/lectures/sdp.ps\r\n" +
      "e=seminar@example.com (Seminar Management)\r\n" +
      "c=IN IP4 0.0.0.0\r\n" +
      "a=control:*\r\n" +
      "t=2873397496 2873404696\r\n" +
      "m=audio 3456 RTP/AVP 0\r\n" +
      "a=control:audio\r\n" +
      "m=video 2232 RTP/AVP 31\r\n" +
      "a=control:video\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
  assertEquals(frame.headerFields, [
    ["CSeq", "312"],
    ["Date", "Thu, 23 Jan 1997 15:35:06 GMT"],
    ["Server", "PhonyServer/1.1"],
    ["Content-Base", "rtsp://server.example.com/fizzle/foo/"],
    ["Content-Type", "application/sdp"],
    ["Content-Length", "345"],
  ]);
  assertEquals(
    new TextDecoder().decode(frame.messageBody),
    "v=0\r\n" +
      "o=MNobody 2890844526 2890842807 IN IP4 192.0.2.46\r\n" +
      "s=SDP Seminar\r\n" +
      "i=A Seminar on the session description protocol\r\n" +
      "u=http://www.example.com/lectures/sdp.ps\r\n" +
      "e=seminar@example.com (Seminar Management)\r\n" +
      "c=IN IP4 0.0.0.0\r\n" +
      "a=control:*\r\n" +
      "t=2873397496 2873404696\r\n" +
      "m=audio 3456 RTP/AVP 0\r\n" +
      "a=control:audio\r\n" +
      "m=video 2232 RTP/AVP 31\r\n" +
      "a=control:video\r\n",
  );
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage skips empty lines before the start-line and counts them", () => {
  const octets = new TextEncoder().encode(
    "\r\n\r\nRTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
  assertEquals(frame.headerFields, [["CSeq", "3"]]);
  assertEquals(bytesRead, 32);
});

test("decodeMessage reads no body without Content-Length and leaves the next message alone", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\nRTSP/2.0 200 OK\r\nCSeq: 4\r\n\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [["CSeq", "3"]]);
  assertEquals(frame.messageBody, new Uint8Array(0));
  assertEquals(bytesRead, 28);
});

test("decodeMessage reads a message with no header fields", () => {
  const octets = new TextEncoder().encode("OPTIONS * RTSP/2.0\r\n\r\n");

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "OPTIONS * RTSP/2.0");
  assertEquals(frame.headerFields, []);
  assertEquals(bytesRead, 22);
});

test("decodeMessage keeps header fields of the same name as separate pairs", () => {
  const octets = new TextEncoder().encode(
    "RTSP/1.0 401 Unauthorized\r\n" +
      'WWW-Authenticate: Digest realm="camera", nonce="abc123"\r\n' +
      "CSeq: 2\r\n" +
      'WWW-Authenticate: Basic realm="camera"\r\n' +
      "\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [
    ["WWW-Authenticate", 'Digest realm="camera", nonce="abc123"'],
    ["CSeq", "2"],
    ["WWW-Authenticate", 'Basic realm="camera"'],
  ]);
});

test("decodeMessage keeps header names in the spelling they were written in", () => {
  const octets = new TextEncoder().encode(
    "RTSP/1.0 200 OK\r\n" +
      "cSEQ: 3\r\n" +
      "SERVER: PhonyServer/1.1\r\n" +
      "x-vendor-tag: abc123\r\n" +
      "\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [
    ["cSEQ", "3"],
    ["SERVER", "PhonyServer/1.1"],
    ["x-vendor-tag", "abc123"],
  ]);
});

test("decodeMessage keeps header fields in the order of their lines", () => {
  const octets = new TextEncoder().encode(
    "RTSP/1.0 200 OK\r\n" +
      "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
      "CSeq: 3\r\n" +
      "Accept-Ranges: npt\r\n" +
      "\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [
    ["Session", "OccldOFFq23KwjYpAnBbUr"],
    ["CSeq", "3"],
    ["Accept-Ranges", "npt"],
  ]);
});

test("decodeMessage finds a Content-Length written in another case", () => {
  const octets = new TextEncoder().encode(
    "RTSP/1.0 200 OK\r\ncontent-LENGTH: 3\r\n\r\nv=0tail",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.messageBody, Uint8Array.of(0x76, 0x3d, 0x30));
  assertEquals(bytesRead, 41);
});

test("decodeMessage leaves the spaces around the colon out of the name and the value", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq \t:   3 \r\n\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [["CSeq", "3"]]);
});

test("decodeMessage splits a header field at its first colon", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nContent-Base: rtsp://example.com:554/fizzle/\r\n\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [
    ["Content-Base", "rtsp://example.com:554/fizzle/"],
  ]);
});

test("decodeMessage returns undefined for no octets", () => {
  assertEquals(decodeMessage(new Uint8Array(0)), undefined);
});

test("decodeMessage returns undefined for empty lines only", () => {
  const octets = new TextEncoder().encode("\r\n\r\n\r\n");

  assertEquals(decodeMessage(octets), undefined);
});

test("decodeMessage returns undefined for an incomplete start-line", () => {
  const octets = new TextEncoder().encode("RTSP/2.0 200");

  assertEquals(decodeMessage(octets), undefined);
});

test("decodeMessage returns undefined for a start-line with no header section end", () => {
  const octets = new TextEncoder().encode("RTSP/2.0 200 OK\r\n");

  assertEquals(decodeMessage(octets), undefined);
});

test("decodeMessage returns undefined for an incomplete header section", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\nContent-Length: 5\r\n\r",
  );

  assertEquals(decodeMessage(octets), undefined);
});

test("decodeMessage returns undefined for an incomplete message body", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\nContent-Length: 5\r\n\r\nv=0\r",
  );

  assertEquals(decodeMessage(octets), undefined);
});

test("decodeMessage reads a subarray from its own start", () => {
  const buffer = new TextEncoder().encode(
    "$\x00\x00\x02ABRTSP/2.0 200 OK\r\nContent-Length: 3\r\n\r\nv=0tail",
  );

  const [frame, bytesRead] = decodeMessage(buffer.subarray(6))!;

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
  assertEquals(frame.messageBody, Uint8Array.of(0x76, 0x3d, 0x30));
  assertEquals(bytesRead, 41);
});

test("decodeMessage returns the message body as a copy", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nContent-Length: 3\r\n\r\nv=0",
  );

  const [frame] = decodeMessage(octets)!;
  octets.fill(0);

  assertEquals(frame.messageBody, Uint8Array.of(0x76, 0x3d, 0x30));
});

test("decodeMessage reads header octets one character each", () => {
  // deno-fmt-ignore
  const octets = Uint8Array.of(
    0x52, 0x54, 0x53, 0x50, 0x2f, 0x32, 0x2e, 0x30, 0x20, 0x32, 0x30, 0x30, 0x20, 0x4f, 0x4b, 0x0d, 0x0a,
    0x53, 0x65, 0x72, 0x76, 0x65, 0x72, 0x3a, 0x20, 0x63, 0x61, 0x66, 0xc3, 0xa9, 0x80, 0x0d, 0x0a,
    0x0d, 0x0a,
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields, [["Server", "cafÃ©\u0080"]]);
});

test("encodeMessage writes the start-line, header fields and an empty line", () => {
  const octets = encodeMessage({
    startLine: "PLAY rtsp://example.com/bar.file RTSP/2.0",
    headerFields: [
      ["CSeq", "3"],
      ["Session", "OccldOFFq23KwjYpAnBbUr"],
      ["User-Agent", "PhonyClient/1.2"],
    ],
    messageBody: new Uint8Array(0),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "PLAY rtsp://example.com/bar.file RTSP/2.0\r\n" +
      "CSeq: 3\r\n" +
      "Session: OccldOFFq23KwjYpAnBbUr\r\n" +
      "User-Agent: PhonyClient/1.2\r\n" +
      "\r\n",
  );
});

test("encodeMessage writes header names in the spelling given", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [
      ["cSEQ", "3"],
      ["SERVER", "PhonyServer/1.1"],
      ["x-vendor-tag", "abc123"],
    ],
    messageBody: new Uint8Array(0),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\n" +
      "cSEQ: 3\r\n" +
      "SERVER: PhonyServer/1.1\r\n" +
      "x-vendor-tag: abc123\r\n" +
      "\r\n",
  );
});

test("encodeMessage writes header fields in the order given", () => {
  const octets = encodeMessage({
    startLine: "PLAY rtsp://example.com/bar.file RTSP/2.0",
    headerFields: [
      ["User-Agent", "PhonyClient/1.2"],
      ["CSeq", "3"],
      ["Accept-Ranges", "npt"],
    ],
    messageBody: new Uint8Array(0),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "PLAY rtsp://example.com/bar.file RTSP/2.0\r\n" +
      "User-Agent: PhonyClient/1.2\r\n" +
      "CSeq: 3\r\n" +
      "Accept-Ranges: npt\r\n" +
      "\r\n",
  );
});

test("encodeMessage writes header fields of the same name as separate lines", () => {
  const octets = encodeMessage({
    startLine: "RTSP/1.0 401 Unauthorized",
    headerFields: [
      ["WWW-Authenticate", 'Digest realm="camera", nonce="abc123"'],
      ["CSeq", "2"],
      ["WWW-Authenticate", 'Basic realm="camera"'],
    ],
    messageBody: new Uint8Array(0),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/1.0 401 Unauthorized\r\n" +
      'WWW-Authenticate: Digest realm="camera", nonce="abc123"\r\n' +
      "CSeq: 2\r\n" +
      'WWW-Authenticate: Basic realm="camera"\r\n' +
      "\r\n",
  );
});

test("encodeMessage appends Content-Length for a message body when there is none", () => {
  const octets = encodeMessage({
    startLine: "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0",
    headerFields: [
      ["CSeq", "421"],
      ["Content-Type", "text/parameters"],
    ],
    messageBody: new TextEncoder().encode("barparam: barstuff\r\n"),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0\r\n" +
      "CSeq: 421\r\n" +
      "Content-Type: text/parameters\r\n" +
      "Content-Length: 20\r\n" +
      "\r\n" +
      "barparam: barstuff\r\n",
  );
});

test("encodeMessage overwrites a wrong Content-Length", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [["Content-Length", "999"]],
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\nContent-Length: 3\r\n\r\nv=0",
  );
});

test("encodeMessage keeps the place and the spelling of the caller's Content-Length", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [
      ["CSeq", "312"],
      ["content-LENGTH", "999"],
      ["Content-Type", "application/sdp"],
    ],
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 312\r\n" +
      "content-LENGTH: 3\r\n" +
      "Content-Type: application/sdp\r\n" +
      "\r\n" +
      "v=0",
  );
});

test("encodeMessage drops a second Content-Length in another spelling", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [
      ["content-LENGTH", "999"],
      ["CSeq", "312"],
      ["Content-Length", "888"],
    ],
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\n" +
      "content-LENGTH: 3\r\n" +
      "CSeq: 312\r\n" +
      "\r\n" +
      "v=0",
  );
});

test("encodeMessage leaves the caller's header fields unchanged", () => {
  const headerFields: [string, string][] = [
    ["CSeq", "312"],
    ["content-LENGTH", "999"],
    ["Content-Length", "888"],
  ];

  encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields,
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(headerFields, [
    ["CSeq", "312"],
    ["content-LENGTH", "999"],
    ["Content-Length", "888"],
  ]);
});

test("encodeMessage adds no Content-Length for an empty message body", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [],
    messageBody: new Uint8Array(0),
  });

  assertEquals(new TextDecoder().decode(octets), "RTSP/2.0 200 OK\r\n\r\n");
});

test("encodeMessage writes a Content-Length the caller set for an empty message body as it is", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [["content-LENGTH", "0"]],
    messageBody: new Uint8Array(0),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\ncontent-LENGTH: 0\r\n\r\n",
  );
});

test("encodeMessage writes header characters one octet each", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [["Server", "café\u0080"]],
    messageBody: new Uint8Array(0),
  });

  // deno-fmt-ignore
  assertEquals(octets, Uint8Array.of(
    0x52, 0x54, 0x53, 0x50, 0x2f, 0x32, 0x2e, 0x30, 0x20, 0x32, 0x30, 0x30, 0x20, 0x4f, 0x4b, 0x0d, 0x0a,
    0x53, 0x65, 0x72, 0x76, 0x65, 0x72, 0x3a, 0x20, 0x63, 0x61, 0x66, 0xe9, 0x80, 0x0d, 0x0a,
    0x0d, 0x0a,
  ));
});

test("encodeMessage output decodes back to the same frame", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: [
      ["CSeq", "312"],
      ["Content-Type", "application/sdp"],
    ],
    messageBody: new TextEncoder().encode("v=0\r\n"),
  });

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
  assertEquals(frame.headerFields, [
    ["CSeq", "312"],
    ["Content-Type", "application/sdp"],
    ["Content-Length", "5"],
  ]);
  assertEquals(frame.messageBody, Uint8Array.of(0x76, 0x3d, 0x30, 0x0d, 0x0a));
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage output encodes back to the same octets", () => {
  const octets = new TextEncoder().encode(
    "RTSP/1.0 200 OK\r\n" +
      "cseq: 312\r\n" +
      "content-LENGTH: 5\r\n" +
      "Content-Type: application/sdp\r\n" +
      "\r\n" +
      "v=0\r\n",
  );

  const [frame] = decodeMessage(octets)!;
  const encoded = encodeMessage(frame);

  assertNotStrictEquals(encoded, octets);
  assertEquals(encoded, octets);
});
