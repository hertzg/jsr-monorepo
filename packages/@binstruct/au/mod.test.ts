import { assertEquals } from "@std/assert";
import {
  AU_DATA_SIZE_UNKNOWN,
  AU_ENCODING,
  AU_HEADER_SIZE,
  AU_MAGIC,
  type AuHeader,
  auHeader,
} from "./mod.ts";

Deno.test("auHeader", async (t) => {
  await t.step("round-trips a header with no annotation", () => {
    const coder = auHeader();
    const header: AuHeader = {
      magic: AU_MAGIC,
      dataOffset: AU_HEADER_SIZE,
      dataSize: 1024,
      encoding: AU_ENCODING.LINEAR_16,
      sampleRate: 44100,
      channels: 2,
      annotation: new Uint8Array(0),
    };

    const buffer = new Uint8Array(AU_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, AU_HEADER_SIZE);
    assertEquals(read, AU_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("sizes the annotation from dataOffset", () => {
    const annotation = new TextEncoder().encode("take 1\0\0");
    const coder = auHeader();
    const header: AuHeader = {
      magic: AU_MAGIC,
      dataOffset: AU_HEADER_SIZE + annotation.length,
      dataSize: 8000,
      encoding: AU_ENCODING.MULAW_8,
      sampleRate: 8000,
      channels: 1,
      annotation,
    };

    const buffer = new Uint8Array(64);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, AU_HEADER_SIZE + 8);
    assertEquals(read, written);
    assertEquals(decoded.annotation, annotation);
  });

  await t.step("decodes a known 8kHz mono µ-law header", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x2e, 0x73, 0x6e, 0x64, // ".snd"
      0x00, 0x00, 0x00, 0x18, // dataOffset = 24
      0xff, 0xff, 0xff, 0xff, // dataSize = unknown
      0x00, 0x00, 0x00, 0x01, // encoding = MULAW_8
      0x00, 0x00, 0x1f, 0x40, // sampleRate = 8000
      0x00, 0x00, 0x00, 0x01, // channels = 1
    ]);

    const [decoded, read] = auHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.magic, AU_MAGIC);
    assertEquals(decoded.dataOffset, AU_HEADER_SIZE);
    assertEquals(decoded.dataSize, AU_DATA_SIZE_UNKNOWN);
    assertEquals(decoded.encoding, AU_ENCODING.MULAW_8);
    assertEquals(decoded.sampleRate, 8000);
    assertEquals(decoded.channels, 1);
    assertEquals(decoded.annotation.length, 0);
  });

  await t.step("magic matches the ASCII bytes .snd", () => {
    const buffer = new Uint8Array(AU_HEADER_SIZE);
    auHeader().encode({
      magic: AU_MAGIC,
      dataOffset: AU_HEADER_SIZE,
      dataSize: 0,
      encoding: AU_ENCODING.LINEAR_8,
      sampleRate: 8000,
      channels: 1,
      annotation: new Uint8Array(0),
    }, buffer);

    assertEquals(
      new TextDecoder().decode(buffer.subarray(0, 4)),
      ".snd",
    );
  });
});
