import { assertEquals } from "@std/assert";
import {
  ICO_IMAGE_TYPE,
  type IcoDir,
  icoDir,
  ICONDIR_SIZE,
  ICONDIRENTRY_SIZE,
} from "./mod.ts";

Deno.test("icoDir", async (t) => {
  await t.step("round-trips a directory with no entries", () => {
    const coder = icoDir();
    const dir: IcoDir = {
      reserved: 0,
      imageType: ICO_IMAGE_TYPE.ICON,
      imageCount: 0,
      entries: [],
    };

    const buffer = new Uint8Array(ICONDIR_SIZE);
    const written = coder.encode(dir, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, ICONDIR_SIZE);
    assertEquals(read, ICONDIR_SIZE);
    assertEquals(decoded, dir);
  });

  await t.step("round-trips a directory with multiple entries", () => {
    const coder = icoDir();
    const dir: IcoDir = {
      reserved: 0,
      imageType: ICO_IMAGE_TYPE.ICON,
      imageCount: 2,
      entries: [
        {
          width: 16,
          height: 16,
          colorCount: 0,
          reserved: 0,
          planes: 1,
          bitCount: 32,
          dataSize: 1128,
          dataOffset: 38,
        },
        {
          width: 32,
          height: 32,
          colorCount: 0,
          reserved: 0,
          planes: 1,
          bitCount: 32,
          dataSize: 2344,
          dataOffset: 1166,
        },
      ],
    };

    const buffer = new Uint8Array(
      ICONDIR_SIZE + 2 * ICONDIRENTRY_SIZE,
    );
    const written = coder.encode(dir, buffer);
    const [decoded, read] = coder.decode(buffer.subarray(0, written));

    assertEquals(written, ICONDIR_SIZE + 2 * ICONDIRENTRY_SIZE);
    assertEquals(read, written);
    assertEquals(decoded, dir);
  });

  await t.step("round-trips a cursor directory", () => {
    const coder = icoDir();
    const dir: IcoDir = {
      reserved: 0,
      imageType: ICO_IMAGE_TYPE.CURSOR,
      imageCount: 1,
      entries: [
        {
          width: 32,
          height: 32,
          colorCount: 0,
          reserved: 0,
          planes: 16,
          bitCount: 16,
          dataSize: 4286,
          dataOffset: 22,
        },
      ],
    };

    const buffer = new Uint8Array(ICONDIR_SIZE + ICONDIRENTRY_SIZE);
    const written = coder.encode(dir, buffer);
    const [decoded, read] = coder.decode(buffer);

    assertEquals(written, read);
    assertEquals(decoded.imageType, ICO_IMAGE_TYPE.CURSOR);
    assertEquals(decoded.entries[0].planes, 16);
    assertEquals(decoded.entries[0].bitCount, 16);
  });

  await t.step("decodes a known two-entry ICONDIR", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x00, // reserved = 0
      0x01, 0x00, // imageType = ICON
      0x02, 0x00, // imageCount = 2
      // entry 0: 16x16, 32bpp, 1128 bytes at offset 22
      0x10, 0x10, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00,
      0x68, 0x04, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
      // entry 1: 32x32, 32bpp, 2344 bytes at offset 1150
      0x20, 0x20, 0x00, 0x00, 0x01, 0x00, 0x20, 0x00,
      0x28, 0x09, 0x00, 0x00, 0x7e, 0x04, 0x00, 0x00,
    ]);

    const [decoded, read] = icoDir().decode(wire);

    assertEquals(read, ICONDIR_SIZE + 2 * ICONDIRENTRY_SIZE);
    assertEquals(decoded.reserved, 0);
    assertEquals(decoded.imageType, ICO_IMAGE_TYPE.ICON);
    assertEquals(decoded.imageCount, 2);
    assertEquals(decoded.entries.length, 2);
    assertEquals(decoded.entries[0], {
      width: 16,
      height: 16,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      dataSize: 0x468,
      dataOffset: 0x16,
    });
    assertEquals(decoded.entries[1], {
      width: 32,
      height: 32,
      colorCount: 0,
      reserved: 0,
      planes: 1,
      bitCount: 32,
      dataSize: 0x928,
      dataOffset: 0x47e,
    });
  });

  await t.step("decodes a known single-entry CUR directory", () => {
    // deno-fmt-ignore
    const wire = new Uint8Array([
      0x00, 0x00, // reserved = 0
      0x02, 0x00, // imageType = CURSOR
      0x01, 0x00, // imageCount = 1
      // entry 0: 32x32, hotspot (8, 8), 16bpp, 4286 bytes at offset 22
      0x20, 0x20, 0x00, 0x00, 0x08, 0x00, 0x10, 0x00,
      0xbe, 0x10, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);

    const [decoded, read] = icoDir().decode(wire);

    assertEquals(read, ICONDIR_SIZE + ICONDIRENTRY_SIZE);
    assertEquals(decoded.imageType, ICO_IMAGE_TYPE.CURSOR);
    assertEquals(decoded.entries[0].planes, 8);
    assertEquals(decoded.entries[0].bitCount, 16);
    assertEquals(decoded.entries[0].dataSize, 0x10be);
    assertEquals(decoded.entries[0].dataOffset, 0x16);
  });
});
