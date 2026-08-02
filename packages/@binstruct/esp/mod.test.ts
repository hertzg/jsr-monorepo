import { assertEquals } from "@std/assert";
import {
  ESP_HEADER_SIZE,
  type EspPacket,
  espPacket,
  IP_PROTOCOL_ESP,
} from "./mod.ts";

Deno.test("espPacket", async (t) => {
  await t.step("round-trips a header with an opaque payload", () => {
    const coder = espPacket();
    const packet: EspPacket = {
      spi: 0x12345678,
      sequenceNumber: 42,
      payloadData: new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0x01]),
    };

    const buffer = new Uint8Array(64);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, ESP_HEADER_SIZE + packet.payloadData.length);
    assertEquals(read, written);
    assertEquals(decoded, packet);
  });

  await t.step("round-trips a header with an empty payload", () => {
    const coder = espPacket();
    const packet: EspPacket = {
      spi: 1,
      sequenceNumber: 0,
      payloadData: new Uint8Array(0),
    };

    const buffer = new Uint8Array(ESP_HEADER_SIZE);
    const written = coder.encode(packet, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, ESP_HEADER_SIZE);
    assertEquals(read, ESP_HEADER_SIZE);
    assertEquals(decoded, packet);
  });

  await t.step("decodes known wire bytes", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x00, 0x03, 0x00, // spi = 768
      0x00, 0x00, 0x00, 0x01, // sequenceNumber = 1
      0xaa, 0xbb, 0xcc, 0xdd, 0xee, // opaque payloadData
    ]);

    const [decoded, read] = espPacket().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.spi, 768);
    assertEquals(decoded.sequenceNumber, 1);
    assertEquals(decoded.payloadData, wire.subarray(ESP_HEADER_SIZE));
  });

  await t.step(
    "decodes a header with the maximum SPI and sequence number",
    () => {
      // deno-fmt-ignore
      const wire = new Uint8Array([
      0xff, 0xff, 0xff, 0xff, // spi = 0xffffffff
      0xff, 0xff, 0xff, 0xff, // sequenceNumber = 0xffffffff
    ]);

      const [decoded, read] = espPacket().decode(wire);

      assertEquals(read, ESP_HEADER_SIZE);
      assertEquals(decoded.spi, 0xffffffff);
      assertEquals(decoded.sequenceNumber, 0xffffffff);
      assertEquals(decoded.payloadData.length, 0);
    },
  );

  await t.step("exposes the well-known constants", () => {
    assertEquals(ESP_HEADER_SIZE, 8);
    assertEquals(IP_PROTOCOL_ESP, 50);
  });
});
