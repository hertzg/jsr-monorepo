import { assertEquals } from "@std/assert";
import {
  ICMPV6_TYPE,
  type Icmpv6Message,
  icmpv6Message,
  IP_PROTOCOL_ICMPV6,
} from "./mod.ts";

Deno.test("icmpv6Message", async (t) => {
  await t.step("round-trips a generic Echo Request", () => {
    const coder = icmpv6Message();
    const message: Icmpv6Message = {
      type: ICMPV6_TYPE.ECHO_REQUEST,
      code: 0,
      checksum: 0x1a2b,
      // First 4 body bytes are the identifier/sequence, followed by echo
      // data.
      body: new Uint8Array([0x00, 0x01, 0x00, 0x01, 0xde, 0xad, 0xbe, 0xef]),
    };

    const buffer = new Uint8Array(4 + message.body.length);
    const written = coder.encode(message, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, buffer.length);
    assertEquals(read, buffer.length);
    assertEquals(decoded.type, message.type);
    assertEquals(decoded.code, message.code);
    assertEquals(decoded.checksum, message.checksum);
    assertEquals(decoded.body, message.body);
  });

  await t.step("round-trips a Packet Too Big message", () => {
    const coder = icmpv6Message();
    const message: Icmpv6Message = {
      type: ICMPV6_TYPE.PACKET_TOO_BIG,
      code: 0,
      checksum: 0x9e21,
      // First 4 body bytes are the MTU field.
      body: new Uint8Array([0x00, 0x00, 0x05, 0xdc]),
    };

    const buffer = new Uint8Array(4 + message.body.length);
    const written = coder.encode(message, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, buffer.length);
    assertEquals(read, buffer.length);
    assertEquals(decoded, message);
  });

  await t.step("decodes a known Time Exceeded message on the wire", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x03, 0x00, 0xfc, 0xff, 0x00, 0x00, 0x00, 0x00,
    ]);
    const [decoded, read] = icmpv6Message().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.type, ICMPV6_TYPE.TIME_EXCEEDED);
    assertEquals(decoded.code, 0);
    assertEquals(decoded.checksum, 0xfcff);
    // The 4 zero bytes RFC 4443 calls "unused" land in body.
    assertEquals(decoded.body, new Uint8Array(4));
  });

  await t.step(
    "decodes a known Neighbor Solicitation header on the wire",
    () => {
      // deno-fmt-ignore
      const wire = new Uint8Array([
        0x87, 0x00, 0x9e, 0x21, // type=135 code=0 checksum
        0x00, 0x00, 0x00, 0x00, // reserved
        0xfe, 0x80, 0x00, 0x00, // target address (truncated for brevity)
      ]);
      const [decoded, read] = icmpv6Message().decode(wire);

      assertEquals(read, wire.length);
      assertEquals(decoded.type, ICMPV6_TYPE.NEIGHBOR_SOLICITATION);
      assertEquals(decoded.code, 0);
      assertEquals(decoded.checksum, 0x9e21);
      assertEquals(decoded.body.length, 8);
    },
  );

  await t.step("exposes the IPv6 next-header protocol number", () => {
    assertEquals(IP_PROTOCOL_ICMPV6, 58);
  });
});
