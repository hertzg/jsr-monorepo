import { assertEquals } from "@std/assert";
import {
  ETHERTYPE_IPV6,
  IPV6_HEADER_SIZE,
  IPV6_NEXT_HEADER,
  type Ipv6Packet,
  ipv6Packet,
} from "./mod.ts";

function makePacket(
  payload: Uint8Array,
  overrides: Partial<Ipv6Packet> = {},
): Ipv6Packet {
  return {
    versionClassFlow: { version: 6, trafficClass: 0, flowLabel: 0 },
    payloadLength: payload.length,
    nextHeader: IPV6_NEXT_HEADER.NO_NEXT_HEADER,
    hopLimit: 64,
    sourceAddress: new Uint8Array(16),
    destinationAddress: new Uint8Array(16),
    payload,
    ...overrides,
  };
}

Deno.test("ipv6Packet", async (t) => {
  await t.step("round-trip with non-empty payload", () => {
    const coder = ipv6Packet();
    const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
    const packet = makePacket(payload, {
      versionClassFlow: { version: 6, trafficClass: 0x1c, flowLabel: 0xabcde },
      nextHeader: IPV6_NEXT_HEADER.UDP,
      hopLimit: 42,
      sourceAddress: new Uint8Array(16).fill(0x11),
      destinationAddress: new Uint8Array(16).fill(0x22),
    });

    const buffer = new Uint8Array(IPV6_HEADER_SIZE + payload.length);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, IPV6_HEADER_SIZE + payload.length);
    assertEquals(read, written);
    assertEquals(decoded, packet);
  });

  await t.step("zero-length payload (header-only)", () => {
    const coder = ipv6Packet();
    const packet = makePacket(new Uint8Array(0));

    const buffer = new Uint8Array(IPV6_HEADER_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, IPV6_HEADER_SIZE);
    assertEquals(read, IPV6_HEADER_SIZE);
    assertEquals(decoded.payloadLength, 0);
    assertEquals(decoded.payload.length, 0);
  });

  await t.step(
    "packs version/trafficClass/flowLabel into one 32-bit word",
    () => {
      const coder = ipv6Packet();
      const packet = makePacket(new Uint8Array(0), {
        versionClassFlow: {
          version: 6,
          trafficClass: 0xff,
          flowLabel: 0xfffff,
        },
      });

      const buffer = new Uint8Array(IPV6_HEADER_SIZE);
      const written = coder.encode(packet, buffer);

      assertEquals(
        buffer.subarray(0, 4),
        new Uint8Array([0x6f, 0xff, 0xff, 0xff]),
      );
      const [decoded] = coder.decode(buffer.subarray(0, written));
      assertEquals(decoded.versionClassFlow, packet.versionClassFlow);
    },
  );

  await t.step("hop limit boundary values", () => {
    const coder = ipv6Packet();
    for (const hopLimit of [0, 1, 64, 255]) {
      const packet = makePacket(new Uint8Array(0), { hopLimit });
      const buffer = new Uint8Array(IPV6_HEADER_SIZE);
      const written = coder.encode(packet, buffer);
      const [decoded] = coder.decode(buffer.subarray(0, written));

      assertEquals(decoded.hopLimit, hopLimit);
    }
  });

  await t.step(
    "decode honours payloadLength even when buffer is larger",
    () => {
      const coder = ipv6Packet();
      // deno-fmt-ignore
      const wire = new Uint8Array([
      0x60, 0x00, 0x00, 0x00, // version=6, trafficClass=0, flowLabel=0
      0x00, 0x02,             // payloadLength = 2
      0x11,                   // nextHeader = UDP
      0x40,                   // hopLimit = 64
      0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // 2001:db8::1
      0x20, 0x01, 0x0d, 0xb8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, // 2001:db8::2
      0xca, 0xfe, // payload
      0xff, 0xff, // trailing garbage that must be ignored
    ]);

      const [decoded, read] = coder.decode(wire);

      assertEquals(read, IPV6_HEADER_SIZE + 2);
      assertEquals(decoded.payload, new Uint8Array([0xca, 0xfe]));
    },
  );

  await t.step("decodes a known-wire loopback packet with no payload", () => {
    const coder = ipv6Packet();
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x60, 0x00, 0x00, 0x00, // version=6, trafficClass=0, flowLabel=0
      0x00, 0x00,             // payloadLength = 0
      0x3b,                   // nextHeader = 59 (No Next Header)
      0x40,                   // hopLimit = 64
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // ::1
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, // ::1
    ]);

    const [decoded, read] = coder.decode(wire);

    assertEquals(read, IPV6_HEADER_SIZE);
    assertEquals(decoded.versionClassFlow, {
      version: 6,
      trafficClass: 0,
      flowLabel: 0,
    });
    assertEquals(decoded.payloadLength, 0);
    assertEquals(decoded.nextHeader, IPV6_NEXT_HEADER.NO_NEXT_HEADER);
    assertEquals(decoded.hopLimit, 64);
    assertEquals(
      decoded.sourceAddress,
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
    );
    assertEquals(
      decoded.destinationAddress,
      new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]),
    );
    assertEquals(decoded.payload.length, 0);
  });

  await t.step(
    "payload longer than payloadLength is truncated on encode",
    () => {
      const coder = ipv6Packet();
      const buffer = new Uint8Array(IPV6_HEADER_SIZE + 2);
      const written = coder.encode(
        makePacket(new Uint8Array([0xa, 0xb, 0xc, 0xd]), {
          payloadLength: 2,
        }),
        buffer,
      );

      assertEquals(written, IPV6_HEADER_SIZE + 2);
      const [decoded] = coder.decode(buffer.subarray(0, written));
      assertEquals(decoded.payload, new Uint8Array([0xa, 0xb]));
    },
  );

  await t.step("well-known constants", () => {
    assertEquals(IPV6_HEADER_SIZE, 40);
    assertEquals(ETHERTYPE_IPV6, 0x86dd);
    assertEquals(IPV6_NEXT_HEADER.TCP, 6);
    assertEquals(IPV6_NEXT_HEADER.UDP, 17);
    assertEquals(IPV6_NEXT_HEADER.ICMPV6, 58);
    assertEquals(IPV6_NEXT_HEADER.NO_NEXT_HEADER, 59);
  });
});
