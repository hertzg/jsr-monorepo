import { assertEquals } from "@std/assert";
import {
  ICMP_TYPE,
  type IcmpEcho,
  icmpEcho,
  icmpHeader,
  type IcmpPacket,
  internetChecksum,
} from "./mod.ts";

Deno.test("internetChecksum", async (t) => {
  await t.step("RFC 1071 worked example", () => {
    // deno-fmt-ignore
    const data = new Uint8Array([
      0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7,
    ]);
    assertEquals(internetChecksum(data), 0x220d);
  });

  await t.step("zero-length input checksums to 0xffff", () => {
    assertEquals(internetChecksum(new Uint8Array()), 0xffff);
  });

  await t.step("odd-length input pads with zero", () => {
    const odd = new Uint8Array([0x00, 0x01, 0xff]);
    // Words: 0x0001, 0xff00 → sum 0xff01 → ~ = 0x00fe
    assertEquals(internetChecksum(odd), 0x00fe);
  });

  await t.step("a valid ICMP echo request checksums to zero", () => {
    // deno-fmt-ignore
    const echoRequest = new Uint8Array([
      0x08, 0x00, 0xf7, 0xfd, 0x00, 0x01, 0x00, 0x01,
    ]);
    assertEquals(internetChecksum(echoRequest), 0x0000);
  });

  await t.step("end-around carry is folded", () => {
    // 0xffff + 0xffff = 0x1fffe; fold → 0xffff; ~ = 0x0000
    const data = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
    assertEquals(internetChecksum(data), 0x0000);
  });
});

Deno.test("icmpHeader", async (t) => {
  await t.step("round-trips a generic packet", () => {
    const coder = icmpHeader();
    const packet: IcmpPacket = {
      type: ICMP_TYPE.ECHO_REQUEST,
      code: 0,
      checksum: 0xf7fd,
      restOfHeader: new Uint8Array([0x00, 0x01, 0x00, 0x01]),
      payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
    };

    const buffer = new Uint8Array(8 + packet.payload.length);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, buffer.length);
    assertEquals(read, buffer.length);
    assertEquals(decoded.type, packet.type);
    assertEquals(decoded.code, packet.code);
    assertEquals(decoded.checksum, packet.checksum);
    assertEquals(decoded.restOfHeader, packet.restOfHeader);
    assertEquals(decoded.payload, packet.payload);
  });

  await t.step("decodes Time Exceeded header with empty payload", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x0b, 0x00, 0xf4, 0xff, 0x00, 0x00, 0x00, 0x00,
    ]);
    const [packet, read] = icmpHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(packet.type, ICMP_TYPE.TIME_EXCEEDED);
    assertEquals(packet.code, 0);
    assertEquals(packet.checksum, 0xf4ff);
    assertEquals(packet.restOfHeader, new Uint8Array(4));
    assertEquals(packet.payload.length, 0);
  });
});

Deno.test("icmpEcho", async (t) => {
  await t.step("round-trips an Echo Request", () => {
    const coder = icmpEcho();
    const payload = new TextEncoder().encode("ping");
    const packet: IcmpEcho = {
      type: ICMP_TYPE.ECHO_REQUEST,
      code: 0,
      checksum: 0,
      identifier: 0xbeef,
      sequence: 42,
      payload,
    };

    const buffer = new Uint8Array(8 + payload.length);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, buffer.length);
    assertEquals(read, buffer.length);
    assertEquals(decoded.identifier, 0xbeef);
    assertEquals(decoded.sequence, 42);
    assertEquals(decoded.payload, payload);
  });

  await t.step("post-encode checksum makes the packet self-verify", () => {
    const coder = icmpEcho();
    const payload = new TextEncoder().encode("hello");
    const packet: IcmpEcho = {
      type: ICMP_TYPE.ECHO_REQUEST,
      code: 0,
      checksum: 0,
      identifier: 0x1234,
      sequence: 1,
      payload,
    };

    const buffer = new Uint8Array(8 + payload.length);
    const written = coder.encode(packet, buffer);

    const view = new DataView(buffer.buffer, buffer.byteOffset, written);
    view.setUint16(2, 0);
    view.setUint16(2, internetChecksum(buffer.subarray(0, written)));

    assertEquals(internetChecksum(buffer.subarray(0, written)), 0);

    const [decoded] = coder.decode(buffer.subarray(0, written));
    assertEquals(decoded.checksum, view.getUint16(2));
  });

  await t.step("decodes a known Echo Reply on the wire", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x00, 0xff, 0xfd, 0x00, 0x01, 0x00, 0x01,
    ]);
    const [packet, read] = icmpEcho().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(packet.type, ICMP_TYPE.ECHO_REPLY);
    assertEquals(packet.code, 0);
    assertEquals(packet.identifier, 1);
    assertEquals(packet.sequence, 1);
    assertEquals(packet.payload.length, 0);
    assertEquals(internetChecksum(wire), 0);
  });
});
