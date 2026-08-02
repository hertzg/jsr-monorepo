import { assertEquals } from "@std/assert";
import {
  RTP_HEADER_MIN_SIZE,
  RTP_VERSION,
  type RtpPacket,
  rtpPacket,
} from "./mod.ts";

Deno.test("rtpPacket", async (t) => {
  await t.step("round-trips a packet with no CSRC entries", () => {
    const coder = rtpPacket();
    const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const packet: RtpPacket = {
      versionFlags: {
        version: RTP_VERSION,
        padding: 0,
        extension: 0,
        csrcCount: 0,
      },
      markerPayloadType: { marker: 0, payloadType: 0 },
      sequenceNumber: 1,
      timestamp: 0,
      ssrc: 0x11223344,
      csrc: [],
      payload,
    };

    const buffer = new Uint8Array(RTP_HEADER_MIN_SIZE + payload.length);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, RTP_HEADER_MIN_SIZE + payload.length);
    assertEquals(read, written);
    assertEquals(decoded, packet);
  });

  await t.step("round-trips a packet with CSRC identifiers", () => {
    const coder = rtpPacket();
    const payload = new Uint8Array([0x01, 0x02, 0x03]);
    const packet: RtpPacket = {
      versionFlags: {
        version: RTP_VERSION,
        padding: 0,
        extension: 0,
        csrcCount: 3,
      },
      markerPayloadType: { marker: 1, payloadType: 96 },
      sequenceNumber: 65535,
      timestamp: 0xffffffff,
      ssrc: 0xcafebabe,
      csrc: [0x11111111, 0x22222222, 0x33333333],
      payload,
    };

    const buffer = new Uint8Array(
      RTP_HEADER_MIN_SIZE + 12 + payload.length,
    );
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, RTP_HEADER_MIN_SIZE + 12 + payload.length);
    assertEquals(read, written);
    assertEquals(decoded, packet);
  });

  await t.step("round-trips padding and extension bits", () => {
    const coder = rtpPacket();
    const packet: RtpPacket = {
      versionFlags: {
        version: RTP_VERSION,
        padding: 1,
        extension: 1,
        csrcCount: 0,
      },
      markerPayloadType: { marker: 0, payloadType: 8 },
      sequenceNumber: 42,
      timestamp: 12345,
      ssrc: 0x01020304,
      csrc: [],
      payload: new Uint8Array(0),
    };

    const buffer = new Uint8Array(RTP_HEADER_MIN_SIZE);
    coder.encode(packet, buffer);
    const [decoded] = coder.decode(buffer);

    assertEquals(decoded.versionFlags.padding, 1);
    assertEquals(decoded.versionFlags.extension, 1);
  });

  await t.step("decodes a known minimal wire packet", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x80, 0x00, 0x00, 0x01, // V=2,P=0,X=0,CC=0 | M=0,PT=0 | seq=1
      0x00, 0x00, 0x00, 0x00, // timestamp = 0
      0x00, 0x00, 0x00, 0x2a, // ssrc = 42
    ]);

    const [decoded, read] = rtpPacket().decode(wire);

    assertEquals(read, RTP_HEADER_MIN_SIZE);
    assertEquals(decoded.versionFlags.version, RTP_VERSION);
    assertEquals(decoded.versionFlags.padding, 0);
    assertEquals(decoded.versionFlags.extension, 0);
    assertEquals(decoded.versionFlags.csrcCount, 0);
    assertEquals(decoded.markerPayloadType.marker, 0);
    assertEquals(decoded.markerPayloadType.payloadType, 0);
    assertEquals(decoded.sequenceNumber, 1);
    assertEquals(decoded.timestamp, 0);
    assertEquals(decoded.ssrc, 42);
    assertEquals(decoded.csrc, []);
    assertEquals(decoded.payload.length, 0);
  });

  await t.step("decodes a known wire packet with two CSRC entries", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x92, 0xe3, 0x12, 0x34, // V=2,P=0,X=1,CC=2 | M=1,PT=99 | seq=0x1234
      0x00, 0x01, 0x86, 0xa0, // timestamp = 100000
      0xde, 0xad, 0xbe, 0xef, // ssrc
      0x11, 0x11, 0x11, 0x11, // csrc[0]
      0x22, 0x22, 0x22, 0x22, // csrc[1]
      0x01, 0x02,             // payload
    ]);

    const [decoded, read] = rtpPacket().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.versionFlags.extension, 1);
    assertEquals(decoded.versionFlags.csrcCount, 2);
    assertEquals(decoded.markerPayloadType.marker, 1);
    assertEquals(decoded.markerPayloadType.payloadType, 99);
    assertEquals(decoded.sequenceNumber, 0x1234);
    assertEquals(decoded.timestamp, 100000);
    assertEquals(decoded.ssrc, 0xdeadbeef);
    assertEquals(decoded.csrc, [0x11111111, 0x22222222]);
    assertEquals(decoded.payload, new Uint8Array([0x01, 0x02]));
  });
});
