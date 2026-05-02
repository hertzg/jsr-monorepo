import { assertEquals } from "@std/assert";
import { IP_PROTOCOL_TCP, TCP_HEADER_MIN_SIZE, tcpPacket } from "./mod.ts";
import type { TcpPacket } from "./mod.ts";

function noFlags(): TcpPacket["flags"] {
  return {
    cwr: 0,
    ece: 0,
    urg: 0,
    ack: 0,
    psh: 0,
    rst: 0,
    syn: 0,
    fin: 0,
  };
}

function makeSegment(
  payload: Uint8Array,
  options: Uint8Array,
  overrides: Partial<TcpPacket> = {},
): TcpPacket {
  return {
    sourcePort: 0,
    destinationPort: 0,
    sequenceNumber: 0,
    acknowledgmentNumber: 0,
    dataOffsetReserved: { dataOffset: 5 + options.length / 4, reserved: 0 },
    flags: noFlags(),
    window: 0,
    checksum: 0,
    urgentPointer: 0,
    options,
    payload,
    ...overrides,
  };
}

Deno.test("tcpPacket: exports IP_PROTOCOL_TCP and TCP_HEADER_MIN_SIZE", () => {
  assertEquals(IP_PROTOCOL_TCP, 6);
  assertEquals(TCP_HEADER_MIN_SIZE, 20);
});

Deno.test("tcpPacket: round-trips a minimal SYN segment", () => {
  const coder = tcpPacket();
  const segment = makeSegment(new Uint8Array(0), new Uint8Array(0), {
    sourcePort: 49152,
    destinationPort: 80,
    sequenceNumber: 0xdeadbeef,
    window: 65535,
    flags: { ...noFlags(), syn: 1 },
  });

  const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE);
  const written = coder.encode(segment, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, TCP_HEADER_MIN_SIZE);
  assertEquals(read, TCP_HEADER_MIN_SIZE);
  assertEquals(decoded.sourcePort, segment.sourcePort);
  assertEquals(decoded.destinationPort, segment.destinationPort);
  assertEquals(decoded.sequenceNumber, segment.sequenceNumber);
  assertEquals(decoded.acknowledgmentNumber, 0);
  assertEquals(decoded.dataOffsetReserved, { dataOffset: 5, reserved: 0 });
  assertEquals(decoded.flags, { ...noFlags(), syn: 1 });
  assertEquals(decoded.window, 65535);
  assertEquals(decoded.options.length, 0);
  assertEquals(decoded.payload.length, 0);
});

Deno.test("tcpPacket: round-trips a segment with options", () => {
  const coder = tcpPacket();
  // MSS option: kind=2, len=4, value=0x05b4 (1460), then NOP NOP NOP NOP padding
  // deno-fmt-ignore
  const options = new Uint8Array([
    0x02, 0x04, 0x05, 0xb4,
    0x01, 0x01, 0x01, 0x01,
  ]);
  const segment = makeSegment(new Uint8Array(0), options, {
    sourcePort: 1234,
    destinationPort: 80,
    sequenceNumber: 1,
    flags: { ...noFlags(), syn: 1 },
  });

  const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE + options.length);
  const written = coder.encode(segment, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, TCP_HEADER_MIN_SIZE + options.length);
  assertEquals(read, written);
  assertEquals(decoded.dataOffsetReserved.dataOffset, 7);
  assertEquals(decoded.options, options);
  assertEquals(decoded.payload.length, 0);
});

Deno.test("tcpPacket: round-trips a segment with payload", () => {
  const coder = tcpPacket();
  const payload = new Uint8Array([0x68, 0x65, 0x6c, 0x6c, 0x6f]);
  const segment = makeSegment(payload, new Uint8Array(0), {
    sourcePort: 49152,
    destinationPort: 443,
    sequenceNumber: 1000,
    acknowledgmentNumber: 2000,
    window: 8192,
    flags: { ...noFlags(), ack: 1, psh: 1 },
  });

  const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE + payload.length);
  const written = coder.encode(segment, buffer);
  const [decoded, read] = coder.decode(buffer);

  assertEquals(written, buffer.length);
  assertEquals(read, buffer.length);
  assertEquals(decoded.payload, payload);
  assertEquals(decoded.flags.ack, 1);
  assertEquals(decoded.flags.psh, 1);
});

Deno.test("tcpPacket: encodes header bytes in network order", () => {
  const coder = tcpPacket();
  const segment = makeSegment(new Uint8Array(0), new Uint8Array(0), {
    sourcePort: 0x1234,
    destinationPort: 0x5678,
    sequenceNumber: 0x11223344,
    acknowledgmentNumber: 0x55667788,
    window: 0x9abc,
    checksum: 0xdef0,
    urgentPointer: 0x1357,
    flags: { ...noFlags(), syn: 1, ack: 1 },
  });

  const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE);
  coder.encode(segment, buffer);

  // deno-fmt-ignore
  const expected = new Uint8Array([
    0x12, 0x34,             // sourcePort
    0x56, 0x78,             // destinationPort
    0x11, 0x22, 0x33, 0x44, // sequenceNumber
    0x55, 0x66, 0x77, 0x88, // acknowledgmentNumber
    0x50,                   // dataOffset=5 (0101), reserved=0000
    0x12,                   // flags: ack(0x10) | syn(0x02)
    0x9a, 0xbc,             // window
    0xde, 0xf0,             // checksum
    0x13, 0x57,             // urgentPointer
  ]);
  assertEquals(buffer, expected);
});

Deno.test("tcpPacket: each flag bit packs into its expected position", () => {
  const coder = tcpPacket();
  const cases: Array<[keyof TcpPacket["flags"], number]> = [
    ["cwr", 0x80],
    ["ece", 0x40],
    ["urg", 0x20],
    ["ack", 0x10],
    ["psh", 0x08],
    ["rst", 0x04],
    ["syn", 0x02],
    ["fin", 0x01],
  ];

  for (const [flag, b13] of cases) {
    const flags = noFlags();
    flags[flag] = 1;
    const segment = makeSegment(new Uint8Array(0), new Uint8Array(0), {
      flags,
    });
    const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE);
    coder.encode(segment, buffer);

    assertEquals(buffer[12], 0x50, `${flag} should leave byte 12 = 0x50`);
    assertEquals(
      buffer[13],
      b13,
      `${flag} should set byte 13 to 0x${b13.toString(16)}`,
    );

    const [decoded] = coder.decode(buffer);
    assertEquals(decoded.flags[flag], 1);
  }
});

Deno.test("tcpPacket: port boundary values", () => {
  const coder = tcpPacket();
  const cases: Array<[number, number]> = [
    [0, 0],
    [0, 65535],
    [65535, 0],
    [65535, 65535],
  ];

  for (const [sourcePort, destinationPort] of cases) {
    const segment = makeSegment(new Uint8Array(0), new Uint8Array(0), {
      sourcePort,
      destinationPort,
    });
    const buffer = new Uint8Array(TCP_HEADER_MIN_SIZE);
    coder.encode(segment, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.sourcePort, sourcePort);
    assertEquals(decoded.destinationPort, destinationPort);
  }
});

Deno.test("tcpPacket: decodes a captured SYN segment to port 80", () => {
  const coder = tcpPacket();
  // Captured TCP/SYN: sourcePort=49152, destinationPort=80, seq=0x12345678,
  // ack=0, dataOffset=8 (32-byte header, 12 bytes of options), flags=SYN,
  // window=29200, checksum=0xb1e6, urgentPointer=0,
  // options: MSS=1460, SACK permitted, partial timestamps placeholder.
  // deno-fmt-ignore
  const captured = new Uint8Array([
    0xc0, 0x00,             // sourcePort = 49152
    0x00, 0x50,             // destinationPort = 80
    0x12, 0x34, 0x56, 0x78, // seq
    0x00, 0x00, 0x00, 0x00, // ack
    0x80,                   // dataOffsetReserved: dataOffset=8, reserved=0
    0x02,                   // flags: syn=1
    0x72, 0x10,             // window = 29200
    0xb1, 0xe6,             // checksum
    0x00, 0x00,             // urgentPointer
    // options (12 bytes)
    0x02, 0x04, 0x05, 0xb4, // MSS=1460
    0x04, 0x02,             // SACK permitted
    0x08, 0x0a, 0x00, 0x00, 0x00, 0x01, // truncated timestamps (placeholder)
  ]);

  const [decoded, read] = coder.decode(captured);

  assertEquals(read, captured.length);
  assertEquals(decoded.sourcePort, 49152);
  assertEquals(decoded.destinationPort, 80);
  assertEquals(decoded.sequenceNumber, 0x12345678);
  assertEquals(decoded.acknowledgmentNumber, 0);
  assertEquals(decoded.dataOffsetReserved, { dataOffset: 8, reserved: 0 });
  assertEquals(decoded.flags.syn, 1);
  assertEquals(decoded.flags.ack, 0);
  assertEquals(decoded.window, 29200);
  assertEquals(decoded.checksum, 0xb1e6);
  assertEquals(decoded.options.length, 12);
  assertEquals(decoded.payload.length, 0);

  // Re-encode and verify byte-for-byte match
  const buffer = new Uint8Array(captured.length);
  const written = coder.encode(decoded, buffer);
  assertEquals(written, captured.length);
  assertEquals(buffer, captured);
});
