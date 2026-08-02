import { assertEquals } from "@std/assert";
import {
  TGA_HEADER_SIZE,
  TGA_IMAGE_TYPE,
  type TgaHeader,
  tgaHeader,
} from "./mod.ts";

Deno.test("tgaHeader", async (t) => {
  await t.step("round-trips a header with no image ID", () => {
    const coder = tgaHeader();
    const header: TgaHeader = {
      idLength: 0,
      colorMapType: 0,
      imageType: TGA_IMAGE_TYPE.trueColor,
      colorMapFirstEntryIndex: 0,
      colorMapLength: 0,
      colorMapEntrySize: 0,
      xOrigin: 0,
      yOrigin: 0,
      width: 64,
      height: 32,
      pixelDepth: 24,
      imageDescriptor: 0,
      imageId: new Uint8Array(0),
    };

    const buffer = new Uint8Array(TGA_HEADER_SIZE);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, TGA_HEADER_SIZE);
    assertEquals(read, TGA_HEADER_SIZE);
    assertEquals(decoded, header);
  });

  await t.step("sizes the image ID from idLength", () => {
    const imageId = new TextEncoder().encode("frame01");
    const coder = tgaHeader();
    const header: TgaHeader = {
      idLength: imageId.length,
      colorMapType: 0,
      imageType: TGA_IMAGE_TYPE.grayscale,
      colorMapFirstEntryIndex: 0,
      colorMapLength: 0,
      colorMapEntrySize: 0,
      xOrigin: 0,
      yOrigin: 0,
      width: 16,
      height: 16,
      pixelDepth: 8,
      imageDescriptor: 0,
      imageId,
    };

    const buffer = new Uint8Array(64);
    const written = coder.encode(header, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, TGA_HEADER_SIZE + imageId.length);
    assertEquals(read, written);
    assertEquals(decoded.imageId, imageId);
    assertEquals(decoded.idLength, imageId.length);
  });

  await t.step("decodes known wire bytes for a color-mapped image", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00,             // idLength = 0
      0x01,             // colorMapType = 1 (present)
      0x01,             // imageType = colorMapped
      0x00, 0x00,       // colorMapFirstEntryIndex = 0
      0x00, 0x01,       // colorMapLength = 256
      0x18,             // colorMapEntrySize = 24
      0x00, 0x00,       // xOrigin = 0
      0x00, 0x00,       // yOrigin = 0
      0x0a, 0x00,       // width = 10
      0x0a, 0x00,       // height = 10
      0x08,             // pixelDepth = 8
      0x00,             // imageDescriptor = 0
    ]);

    const [decoded, read] = tgaHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.colorMapType, 1);
    assertEquals(decoded.imageType, TGA_IMAGE_TYPE.colorMapped);
    assertEquals(decoded.colorMapFirstEntryIndex, 0);
    assertEquals(decoded.colorMapLength, 256);
    assertEquals(decoded.colorMapEntrySize, 24);
    assertEquals(decoded.width, 10);
    assertEquals(decoded.height, 10);
    assertEquals(decoded.pixelDepth, 8);
    assertEquals(decoded.imageId.length, 0);
  });

  await t.step("decodes known wire bytes with an image ID and origin", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x04,             // idLength = 4
      0x00,             // colorMapType = 0 (absent)
      0x0a,             // imageType = rleTrueColor
      0x00, 0x00,       // colorMapFirstEntryIndex = 0
      0x00, 0x00,       // colorMapLength = 0
      0x00,             // colorMapEntrySize = 0
      0x0a, 0x00,       // xOrigin = 10
      0x14, 0x00,       // yOrigin = 20
      0x00, 0x01,       // width = 256
      0x80, 0x00,       // height = 128
      0x20,             // pixelDepth = 32
      0x28,             // imageDescriptor = 0x28
      0x74, 0x65, 0x73, 0x74, // imageId = "test"
    ]);

    const [decoded, read] = tgaHeader().decode(wire);

    assertEquals(read, wire.length);
    assertEquals(decoded.idLength, 4);
    assertEquals(decoded.imageType, TGA_IMAGE_TYPE.rleTrueColor);
    assertEquals(decoded.xOrigin, 10);
    assertEquals(decoded.yOrigin, 20);
    assertEquals(decoded.width, 256);
    assertEquals(decoded.height, 128);
    assertEquals(decoded.pixelDepth, 32);
    assertEquals(decoded.imageDescriptor, 0x28);
    assertEquals(
      new TextDecoder().decode(decoded.imageId),
      "test",
    );
  });
});
