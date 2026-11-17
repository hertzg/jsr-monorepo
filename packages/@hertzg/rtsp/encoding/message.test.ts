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
  assertEquals(Array.from(frame.headerFields), [
    ["accept-ranges", "npt, smpte, clock"],
    ["cseq", "2"],
    ["transport", "RTP/AVP/TCP;unicast;interleaved=0-1"],
    ["user-agent", "PhonyClient/1.2"],
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
  assertEquals(Array.from(frame.headerFields), [
    ["accept-ranges", "npt"],
    ["cseq", "2"],
    ["date", "Thu, 05 Jun 1997 18:57:18 GMT"],
    ["media-properties", "Random-Access=0.2, Immutable, Unlimited"],
    ["session", "OccldOFFq23KwjYpAnBbUr"],
    ["transport", "RTP/AVP/TCP;unicast;interleaved=5-6"],
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
  assertEquals(Array.from(frame.headerFields), [
    ["cseq", "3"],
    ["session", "OccldOFFq23KwjYpAnBbUr"],
    ["user-agent", "PhonyClient/1.2"],
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

  assertEquals(
    frame.headerFields.get("RTP-Info"),
    'url="rtsp://example.com/bar.file" ssrc=0D12F123:seq=232433;rtptime=972948234',
  );
  assertEquals(frame.headerFields.get("Range"), "npt=0-56.8");
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

  assertEquals(frame.headerFields.get("Public"), "OPTIONS, DESCRIBE");
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
  assertEquals(Array.from(frame.headerFields), [
    ["content-base", "rtsp://server.example.com/fizzle/foo/"],
    ["content-length", "345"],
    ["content-type", "application/sdp"],
    ["cseq", "312"],
    ["date", "Thu, 23 Jan 1997 15:35:06 GMT"],
    ["server", "PhonyServer/1.1"],
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
  assertEquals(frame.headerFields.get("CSeq"), "3");
  assertEquals(bytesRead, 32);
});

test("decodeMessage reads no body without Content-Length and leaves the next message alone", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq: 3\r\n\r\nRTSP/2.0 200 OK\r\nCSeq: 4\r\n\r\n",
  );

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.headerFields.get("CSeq"), "3");
  assertEquals(frame.messageBody, new Uint8Array(0));
  assertEquals(bytesRead, 28);
});

test("decodeMessage reads a message with no header fields", () => {
  const octets = new TextEncoder().encode("OPTIONS * RTSP/2.0\r\n\r\n");

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "OPTIONS * RTSP/2.0");
  assertEquals(Array.from(frame.headerFields), []);
  assertEquals(bytesRead, 22);
});

test("decodeMessage joins header fields of the same name with a comma", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nPublic: OPTIONS\r\nPublic: DESCRIBE\r\n\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(frame.headerFields.get("Public"), "OPTIONS, DESCRIBE");
});

test("decodeMessage allows spaces around the colon of a header field", () => {
  const octets = new TextEncoder().encode(
    "RTSP/2.0 200 OK\r\nCSeq \t:   3\r\n\r\n",
  );

  const [frame] = decodeMessage(octets)!;

  assertEquals(Array.from(frame.headerFields), [["cseq", "3"]]);
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

  assertEquals(frame.headerFields.get("Server"), "cafÃ©\u0080");
});

test("encodeMessage writes the start-line, header fields and an empty line", () => {
  const octets = encodeMessage({
    startLine: "PLAY rtsp://example.com/bar.file RTSP/2.0",
    headerFields: new Headers([
      ["CSeq", "3"],
      ["Session", "OccldOFFq23KwjYpAnBbUr"],
      ["User-Agent", "PhonyClient/1.2"],
    ]),
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

test("encodeMessage spells header names the way RFC 7826 does", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: new Headers([
      ["cseq", "3"],
      ["mtag", '"xyzzy"'],
      ["rtp-info", 'url="rtsp://example.com/bar.file"'],
      ["www-authenticate", "Basic"],
      ["proxy-authentication-info", "nextnonce=abc"],
    ]),
    messageBody: new Uint8Array(0),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\n" +
      "CSeq: 3\r\n" +
      'MTag: "xyzzy"\r\n' +
      "Proxy-Authentication-Info: nextnonce=abc\r\n" +
      'RTP-Info: url="rtsp://example.com/bar.file"\r\n' +
      "WWW-Authenticate: Basic\r\n" +
      "\r\n",
  );
});

test("encodeMessage sets Content-Length for a message body", () => {
  const octets = encodeMessage({
    startLine: "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0",
    headerFields: new Headers([["CSeq", "421"]]),
    messageBody: new TextEncoder().encode("barparam: barstuff\r\n"),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "SET_PARAMETER rtsp://example.com/fizzle/foo RTSP/2.0\r\n" +
      "Content-Length: 20\r\n" +
      "CSeq: 421\r\n" +
      "\r\n" +
      "barparam: barstuff\r\n",
  );
});

test("encodeMessage overwrites a wrong Content-Length", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: new Headers([["Content-Length", "999"]]),
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(
    new TextDecoder().decode(octets),
    "RTSP/2.0 200 OK\r\nContent-Length: 3\r\n\r\nv=0",
  );
});

test("encodeMessage leaves the caller's header fields unchanged", () => {
  const headerFields = new Headers([["Content-Length", "999"]]);

  encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields,
    messageBody: Uint8Array.of(0x76, 0x3d, 0x30),
  });

  assertEquals(Array.from(headerFields), [["content-length", "999"]]);
});

test("encodeMessage adds no Content-Length for an empty message body", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: new Headers(),
    messageBody: new Uint8Array(0),
  });

  assertEquals(new TextDecoder().decode(octets), "RTSP/2.0 200 OK\r\n\r\n");
});

test("encodeMessage writes header characters one octet each", () => {
  const octets = encodeMessage({
    startLine: "RTSP/2.0 200 OK",
    headerFields: new Headers([["Server", "café\u0080"]]),
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
    headerFields: new Headers([
      ["CSeq", "312"],
      ["Content-Type", "application/sdp"],
    ]),
    messageBody: new TextEncoder().encode("v=0\r\n"),
  });

  const [frame, bytesRead] = decodeMessage(octets)!;

  assertEquals(frame.startLine, "RTSP/2.0 200 OK");
  assertEquals(Array.from(frame.headerFields), [
    ["content-length", "5"],
    ["content-type", "application/sdp"],
    ["cseq", "312"],
  ]);
  assertEquals(frame.messageBody, Uint8Array.of(0x76, 0x3d, 0x30, 0x0d, 0x0a));
  assertEquals(bytesRead, octets.length);
});

test("decodeMessage output encodes back to the same octets", () => {
  const octets = new TextEncoder().encode(
    "RTSP/1.0 200 OK\r\n" +
      "Content-Length: 5\r\n" +
      "Content-Type: application/sdp\r\n" +
      "CSeq: 312\r\n" +
      "\r\n" +
      "v=0\r\n",
  );

  const [frame] = decodeMessage(octets)!;
  const encoded = encodeMessage(frame);

  assertNotStrictEquals(encoded, octets);
  assertEquals(encoded, octets);
});
