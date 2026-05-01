import { assertEquals } from "@std/assert";
import { UDP_HEADER_SIZE, udpPacket } from "./mod.ts";
import type { UdpPacket } from "./mod.ts";

function makeDatagram(
  payload: Uint8Array,
  overrides: Partial<UdpPacket> = {},
): UdpPacket {
  return {
    srcPort: 0,
    dstPort: 0,
    length: UDP_HEADER_SIZE + payload.length,
    checksum: 0,
    payload,
    ...overrides,
  };
}

Deno.test("udpPacket", async (t) => {
  await t.step("round-trip with non-empty payload", () => {
    const coder = udpPacket();
    const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const datagram = makeDatagram(payload, {
      srcPort: 53,
      dstPort: 49152,
      checksum: 0xc0de,
    });

    const buffer = new Uint8Array(64);
    const written = coder.encode(datagram, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, UDP_HEADER_SIZE + payload.length);
    assertEquals(read, written);
    assertEquals(decoded.srcPort, datagram.srcPort);
    assertEquals(decoded.dstPort, datagram.dstPort);
    assertEquals(decoded.length, datagram.length);
    assertEquals(decoded.checksum, datagram.checksum);
    assertEquals(decoded.payload, payload);
  });

  await t.step("zero-length payload (header-only)", () => {
    const coder = udpPacket();
    const datagram = makeDatagram(new Uint8Array(0), {
      srcPort: 1234,
      dstPort: 5678,
    });

    const buffer = new Uint8Array(UDP_HEADER_SIZE);
    const written = coder.encode(datagram, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, UDP_HEADER_SIZE);
    assertEquals(read, UDP_HEADER_SIZE);
    assertEquals(decoded.length, UDP_HEADER_SIZE);
    assertEquals(decoded.payload.length, 0);
  });

  await t.step("checksum=0 (IPv4 'not computed')", () => {
    const coder = udpPacket();
    const payload = new Uint8Array([0x10, 0x20, 0x30]);
    const datagram = makeDatagram(payload, {
      srcPort: 9999,
      dstPort: 80,
      checksum: 0,
    });

    const buffer = new Uint8Array(32);
    const written = coder.encode(datagram, buffer);
    const [decoded] = coder.decode(buffer.subarray(0, written));

    assertEquals(decoded.checksum, 0);
    assertEquals(decoded.payload, payload);
  });

  await t.step("port boundary values", () => {
    const coder = udpPacket();
    const payload = new Uint8Array([0xff]);
    const cases: Array<[number, number]> = [
      [0, 0],
      [0, 65535],
      [65535, 0],
      [65535, 65535],
      [1, 65534],
    ];

    for (const [srcPort, dstPort] of cases) {
      const datagram = makeDatagram(payload, { srcPort, dstPort });
      const buffer = new Uint8Array(16);
      const written = coder.encode(datagram, buffer);
      const [decoded] = coder.decode(buffer.subarray(0, written));

      assertEquals(decoded.srcPort, srcPort);
      assertEquals(decoded.dstPort, dstPort);
    }
  });

  await t.step("encodes header bytes in network order", () => {
    const coder = udpPacket();
    const payload = new Uint8Array([0xaa]);
    const datagram = makeDatagram(payload, {
      srcPort: 0x1234,
      dstPort: 0x5678,
      checksum: 0x9abc,
    });

    const buffer = new Uint8Array(16);
    const written = coder.encode(datagram, buffer);

    // deno-fmt-ignore
    const expected = new Uint8Array([
      0x12, 0x34, // srcPort
      0x56, 0x78, // dstPort
      0x00, 0x09, // length = 8 + 1
      0x9a, 0xbc, // checksum
      0xaa,       // payload
    ]);
    assertEquals(buffer.subarray(0, written), expected);
  });

  await t.step(
    "decode honours length field even when buffer is larger",
    () => {
      const coder = udpPacket();
      // deno-fmt-ignore
      const wire = new Uint8Array([
        0x00, 0x35, // srcPort
        0x80, 0x00, // dstPort
        0x00, 0x0a, // length = 10 (header + 2 payload bytes)
        0x00, 0x00, // checksum
        0x01, 0x02, // payload
        0xff, 0xff, // trailing garbage that must be ignored
      ]);

      const [decoded, read] = coder.decode(wire);

      assertEquals(read, 10);
      assertEquals(decoded.payload, new Uint8Array([0x01, 0x02]));
    },
  );

  await t.step("payload longer than length is truncated on encode", () => {
    const coder = udpPacket();
    const buffer = new Uint8Array(16);
    const written = coder.encode({
      srcPort: 1,
      dstPort: 2,
      length: UDP_HEADER_SIZE + 2,
      checksum: 0,
      payload: new Uint8Array([0xa, 0xb, 0xc, 0xd]),
    }, buffer);

    assertEquals(written, UDP_HEADER_SIZE + 2);
    const [decoded] = coder.decode(buffer.subarray(0, written));
    assertEquals(decoded.payload, new Uint8Array([0xa, 0xb]));
  });
});
