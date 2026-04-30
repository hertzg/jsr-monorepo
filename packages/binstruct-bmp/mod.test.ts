import { assertEquals } from "@std/assert";
import {
  bitmapFileHeader,
  bitmapInfoHeader,
  type BmpFile,
  bmp,
  pixelDataSize,
  rowStride,
} from "@binstruct/bmp";

Deno.test("bitmapFileHeader: round-trips a 14-byte header", () => {
  const coder = bitmapFileHeader();
  const header = {
    signature: "BM",
    fileSize: 70,
    reserved1: 0,
    reserved2: 0,
    pixelOffset: 54,
  };

  const buffer = new Uint8Array(14);
  const bytesWritten = coder.encode(header, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 14);
  assertEquals(bytesRead, 14);
  assertEquals(decoded, header);

  // Verify byte layout: "BM" + fileSize=70(LE) + 0 + 0 + offset=54(LE).
  // deno-fmt-ignore
  assertEquals(buffer, new Uint8Array([
    0x42, 0x4d, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x36, 0x00, 0x00, 0x00,
  ]));
});

Deno.test("bitmapInfoHeader: round-trips a 40-byte BITMAPINFOHEADER", () => {
  const coder = bitmapInfoHeader();
  const dib = {
    size: 40,
    width: 2,
    height: 2,
    planes: 1,
    bpp: 24,
    compression: 0,
    imageSize: 16,
    xPixelsPerMeter: 2835,
    yPixelsPerMeter: 2835,
    colorsUsed: 0,
    importantColors: 0,
  };

  const buffer = new Uint8Array(40);
  const bytesWritten = coder.encode(dib, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 40);
  assertEquals(bytesRead, 40);
  assertEquals(decoded, dib);
});

Deno.test("bitmapInfoHeader: preserves negative height for top-down DIBs", () => {
  const coder = bitmapInfoHeader();
  const dib = {
    size: 40,
    width: 4,
    height: -3,
    planes: 1,
    bpp: 32,
    compression: 0,
    imageSize: 0,
    xPixelsPerMeter: 0,
    yPixelsPerMeter: 0,
    colorsUsed: 0,
    importantColors: 0,
  };

  const buffer = new Uint8Array(40);
  coder.encode(dib, buffer);
  const [decoded] = coder.decode(buffer);

  assertEquals(decoded.height, -3);
});

Deno.test("rowStride: matches the canonical formula", () => {
  assertEquals(rowStride(1, 1), 4);
  assertEquals(rowStride(1, 24), 4);
  assertEquals(rowStride(2, 24), 8);
  assertEquals(rowStride(3, 24), 12);
  assertEquals(rowStride(2, 32), 8);
  assertEquals(rowStride(1, 8), 4);
});

Deno.test("pixelDataSize: ignores the sign of height", () => {
  assertEquals(pixelDataSize(2, 2, 24), 16);
  assertEquals(pixelDataSize(2, -2, 24), 16);
  assertEquals(pixelDataSize(2, -2, 32), 16);
  assertEquals(pixelDataSize(3, 4, 24), 48);
});

Deno.test("bmp: round-trips a 2x2 24bpp bottom-up image", () => {
  const coder = bmp();
  const image: BmpFile = {
    file: {
      signature: "BM",
      fileSize: 70,
      reserved1: 0,
      reserved2: 0,
      pixelOffset: 54,
    },
    dib: {
      size: 40,
      width: 2,
      height: 2,
      planes: 1,
      bpp: 24,
      compression: 0,
      imageSize: 16,
      xPixelsPerMeter: 2835,
      yPixelsPerMeter: 2835,
      colorsUsed: 0,
      importantColors: 0,
    },
    // deno-fmt-ignore
    pixelData: new Uint8Array([
      0x00, 0x00, 0xff,  0xff, 0x00, 0x00,  0x00, 0x00,
      0x00, 0xff, 0x00,  0xff, 0xff, 0xff,  0x00, 0x00,
    ]),
  };

  const buffer = new Uint8Array(image.file.fileSize);
  const bytesWritten = coder.encode(image, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 70);
  assertEquals(bytesRead, 70);
  assertEquals(decoded.file, image.file);
  assertEquals(decoded.dib, image.dib);
  assertEquals(decoded.pixelData, image.pixelData);
});

Deno.test("bmp: round-trips a 2x2 32bpp top-down image", () => {
  const coder = bmp();
  const image: BmpFile = {
    file: {
      signature: "BM",
      fileSize: 70,
      reserved1: 0,
      reserved2: 0,
      pixelOffset: 54,
    },
    dib: {
      size: 40,
      width: 2,
      height: -2,
      planes: 1,
      bpp: 32,
      compression: 0,
      imageSize: 16,
      xPixelsPerMeter: 0,
      yPixelsPerMeter: 0,
      colorsUsed: 0,
      importantColors: 0,
    },
    // deno-fmt-ignore
    pixelData: new Uint8Array([
      0x00, 0x00, 0xff, 0xff,  0xff, 0x00, 0x00, 0xff,
      0x00, 0xff, 0x00, 0xff,  0xff, 0xff, 0xff, 0xff,
    ]),
  };

  const buffer = new Uint8Array(image.file.fileSize);
  const bytesWritten = coder.encode(image, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, 70);
  assertEquals(bytesRead, 70);
  assertEquals(decoded.dib.height, -2);
  assertEquals(decoded.dib.bpp, 32);
  assertEquals(decoded.pixelData, image.pixelData);
});

Deno.test("bmp: round-trips a 3x2 24bpp image with row padding", () => {
  // 3 pixels × 3 bytes = 9 bytes; padded to 12 per row; 2 rows = 24 bytes.
  const coder = bmp();
  const image: BmpFile = {
    file: {
      signature: "BM",
      fileSize: 14 + 40 + 24,
      reserved1: 0,
      reserved2: 0,
      pixelOffset: 54,
    },
    dib: {
      size: 40,
      width: 3,
      height: 2,
      planes: 1,
      bpp: 24,
      compression: 0,
      imageSize: 24,
      xPixelsPerMeter: 0,
      yPixelsPerMeter: 0,
      colorsUsed: 0,
      importantColors: 0,
    },
    // deno-fmt-ignore
    pixelData: new Uint8Array([
      0x10, 0x20, 0x30,  0x40, 0x50, 0x60,  0x70, 0x80, 0x90,  0x00, 0x00, 0x00,
      0x11, 0x22, 0x33,  0x44, 0x55, 0x66,  0x77, 0x88, 0x99,  0x00, 0x00, 0x00,
    ]),
  };

  const buffer = new Uint8Array(image.file.fileSize);
  const bytesWritten = coder.encode(image, buffer);
  const [decoded, bytesRead] = coder.decode(buffer);

  assertEquals(bytesWritten, image.file.fileSize);
  assertEquals(bytesRead, image.file.fileSize);
  assertEquals(decoded.pixelData.length, 24);
  assertEquals(decoded.pixelData, image.pixelData);
});
