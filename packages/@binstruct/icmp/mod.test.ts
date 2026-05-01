import { assertEquals } from "@std/assert";
import { ICMP_TYPE, type IcmpPacket, icmpPacket } from "./mod.ts";

Deno.test("icmpPacket", async (t) => {
  await t.step("round-trips a generic packet", () => {
    const coder = icmpPacket();
    const packet: IcmpPacket = {
      type: ICMP_TYPE.ECHO_REQUEST,
      code: 0,
      checksum: 0xf7fd,
      // First 4 payload bytes are the type-specific identifier/sequence,
      // followed by echo data.
      payload: new Uint8Array([0x00, 0x01, 0x00, 0x01, 0xde, 0xad, 0xbe, 0xef]),
    };

    const buffer = new Uint8Array(4 + packet.payload.length);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, buffer.length);
    assertEquals(read, buffer.length);
    assertEquals(decoded.type, packet.type);
    assertEquals(decoded.code, packet.code);
    assertEquals(decoded.checksum, packet.checksum);
    assertEquals(decoded.payload, packet.payload);
  });

  await t.step("decodes Time Exceeded with empty payload", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x0b, 0x00, 0xf4, 0xff, 0x00, 0x00, 0x00, 0x00,
    ]);
    const [packet, read] = icmpPacket().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(packet.type, ICMP_TYPE.TIME_EXCEEDED);
    assertEquals(packet.code, 0);
    assertEquals(packet.checksum, 0xf4ff);
    // The 4 zero bytes that RFC 792 calls "rest of header" land in payload.
    assertEquals(packet.payload, new Uint8Array(4));
  });

  await t.step("decodes a known Echo Reply on the wire", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x00, 0xff, 0xfd, 0x00, 0x01, 0x00, 0x01,
    ]);
    const [packet, read] = icmpPacket().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(packet.type, ICMP_TYPE.ECHO_REPLY);
    assertEquals(packet.code, 0);
    // identifier=1, sequence=1 — first two u16be in the payload.
    assertEquals(packet.payload, new Uint8Array([0x00, 0x01, 0x00, 0x01]));
  });
});
