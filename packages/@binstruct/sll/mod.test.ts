import { assertEquals } from "@std/assert";
import { SLL_HEADER_SIZE, SLL_PACKET_TYPE, sllHeader } from "./mod.ts";
import type { SllHeader } from "./mod.ts";

function makeHeader(
  payload: Uint8Array,
  overrides: Partial<SllHeader> = {},
): SllHeader {
  return {
    packetType: SLL_PACKET_TYPE.HOST,
    arphrdType: 1,
    linkLayerAddressLength: 0,
    linkLayerAddress: new Uint8Array(8),
    protocol: 0,
    payload,
    ...overrides,
  };
}

Deno.test("sllHeader", async (t) => {
  await t.step("round-trips a header with a payload", () => {
    const coder = sllHeader();
    const payload = new Uint8Array([0x45, 0x00, 0x00, 0x14]);
    const header = makeHeader(payload, {
      packetType: SLL_PACKET_TYPE.OUTGOING,
      arphrdType: 1,
      linkLayerAddressLength: 6,
      linkLayerAddress: new Uint8Array([
        0x00,
        0x11,
        0x22,
        0x33,
        0x44,
        0x55,
        0x00,
        0x00,
      ]),
      protocol: 0x0800,
    });

    const buffer = new Uint8Array(64);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, SLL_HEADER_SIZE + payload.length);
    assertEquals(read, written);
    assertEquals(decoded, header);
  });

  await t.step("round-trips a header with an empty payload", () => {
    const coder = sllHeader();
    const header = makeHeader(new Uint8Array(0));

    const buffer = new Uint8Array(SLL_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, SLL_HEADER_SIZE);
    assertEquals(read, SLL_HEADER_SIZE);
    assertEquals(decoded.payload.length, 0);
  });

  await t.step("linkLayerAddress is always written as 8 bytes", () => {
    const coder = sllHeader();
    const header = makeHeader(new Uint8Array(0), {
      linkLayerAddressLength: 4,
      linkLayerAddress: new Uint8Array([0xc0, 0xa8, 0x01, 0x01, 0, 0, 0, 0]),
    });

    const buffer = new Uint8Array(SLL_HEADER_SIZE);
    const written = coder.encode(header, buffer);

    assertEquals(written, SLL_HEADER_SIZE);
    assertEquals(buffer.subarray(6, 14).length, 8);
  });

  await t.step("decodes a known Ethernet/ARP-carrying header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x00,                                     // packetType: HOST
      0x00, 0x01,                                     // arphrdType: ARPHRD_ETHER
      0x00, 0x06,                                     // linkLayerAddressLength: 6
      0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x00, 0x00,  // linkLayerAddress (8 bytes)
      0x08, 0x06,                                     // protocol: ARP
      0x00, 0x01, 0x08, 0x00,                          // payload
    ]);

    const [decoded, read] = sllHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.packetType, SLL_PACKET_TYPE.HOST);
    assertEquals(decoded.arphrdType, 1);
    assertEquals(decoded.linkLayerAddressLength, 6);
    assertEquals(
      decoded.linkLayerAddress,
      new Uint8Array([0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x00, 0x00]),
    );
    assertEquals(decoded.protocol, 0x0806);
    assertEquals(decoded.payload, new Uint8Array([0x00, 0x01, 0x08, 0x00]));
  });

  await t.step("decodes a known broadcast/loopback-style header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x04,             // packetType: OUTGOING
      0x03, 0xe8,             // arphrdType: 1000 (ARPHRD_LOOPBACK)
      0x00, 0x00,             // linkLayerAddressLength: 0
      0, 0, 0, 0, 0, 0, 0, 0, // linkLayerAddress (unused)
      0x08, 0x00,             // protocol: IPv4
      0xde, 0xad,             // payload
    ]);

    const [decoded, read] = sllHeader().decode(wire);

    assertEquals(read, SLL_HEADER_SIZE + 2);
    assertEquals(decoded.packetType, SLL_PACKET_TYPE.OUTGOING);
    assertEquals(decoded.arphrdType, 1000);
    assertEquals(decoded.linkLayerAddressLength, 0);
    assertEquals(decoded.protocol, 0x0800);
    assertEquals(decoded.payload, new Uint8Array([0xde, 0xad]));
  });

  await t.step("all packetType values round-trip", () => {
    const coder = sllHeader();
    const values = [
      SLL_PACKET_TYPE.HOST,
      SLL_PACKET_TYPE.BROADCAST,
      SLL_PACKET_TYPE.MULTICAST,
      SLL_PACKET_TYPE.OTHER_HOST,
      SLL_PACKET_TYPE.OUTGOING,
    ];

    for (const packetType of values) {
      const header = makeHeader(new Uint8Array(0), { packetType });
      const buffer = new Uint8Array(SLL_HEADER_SIZE);
      const written = coder.encode(header, buffer);
      const [decoded] = coder.decode(buffer.subarray(0, written));

      assertEquals(decoded.packetType, packetType);
    }
  });

  await t.step("encodes header bytes in network order", () => {
    const coder = sllHeader();
    const header = makeHeader(new Uint8Array([0xaa]), {
      packetType: 0x0102,
      arphrdType: 0x0304,
      linkLayerAddressLength: 0x0506,
      linkLayerAddress: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
      protocol: 0x0708,
    });

    const buffer = new Uint8Array(32);
    const written = coder.encode(header, buffer);

    // deno-fmt-ignore
    const expected = new Uint8Array([
      0x01, 0x02, // packetType
      0x03, 0x04, // arphrdType
      0x05, 0x06, // linkLayerAddressLength
      1, 2, 3, 4, 5, 6, 7, 8, // linkLayerAddress
      0x07, 0x08, // protocol
      0xaa,       // payload
    ]);
    assertEquals(buffer.subarray(0, written), expected);
  });
});
