import { assertEquals } from "@std/assert";
import { type PngChunk, pngChunk, type PngFile, pngFile } from "./mod.ts";

Deno.test("PNG file encoding and decoding", async (t) => {
  await t.step("basic PNG file", () => {
    const pngCoder = pngFile();
    const testPng: PngFile = {
      signature: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunks: [
        {
          length: 13,
          type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
          data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
          crc: 0x12345678,
        },
        {
          length: 0,
          type: new Uint8Array([73, 69, 78, 68]), // "IEND"
          data: new Uint8Array(0),
          crc: 0xAE426082,
        },
      ],
    };

    const buffer = new Uint8Array(100);
    const bytesWritten = pngCoder.encode(testPng, buffer);
    const [decodedPng, bytesRead] = pngCoder.decode(
      buffer.subarray(0, bytesWritten),
    );

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedPng.signature, testPng.signature);
    assertEquals(decodedPng.chunks.length, testPng.chunks.length);
    assertEquals(decodedPng.chunks[0].type, new Uint8Array([73, 72, 68, 82])); // "IHDR"
    assertEquals(decodedPng.chunks[1].type, new Uint8Array([73, 69, 78, 68])); // "IEND"
  });

  await t.step("PNG file with multiple chunks", () => {
    const pngCoder = pngFile();
    const testPng: PngFile = {
      signature: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
      chunks: [
        {
          length: 13,
          type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
          data: new Uint8Array([0, 0, 0, 64, 0, 0, 0, 64, 8, 2, 0, 0, 0]),
          crc: 0x12345678,
        },
        {
          length: 9,
          type: new Uint8Array([80, 76, 84, 69]), // "PLTE"
          data: new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]),
          crc: 0x87654321,
        },
        {
          length: 10,
          type: new Uint8Array([73, 68, 65, 84]), // "IDAT"
          data: new Uint8Array([120, 156, 99, 96, 0, 0, 0, 0, 0, 0]),
          crc: 0x11111111,
        },
        {
          length: 0,
          type: new Uint8Array([73, 69, 78, 68]), // "IEND"
          data: new Uint8Array(0),
          crc: 0xAE426082,
        },
      ],
    };

    const buffer = new Uint8Array(200);
    const bytesWritten = pngCoder.encode(testPng, buffer);
    const [decodedPng, bytesRead] = pngCoder.decode(
      buffer.subarray(0, bytesWritten),
    );

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedPng.signature, testPng.signature);
    assertEquals(decodedPng.chunks.length, 4);
    assertEquals(decodedPng.chunks[0].type, new Uint8Array([73, 72, 68, 82])); // "IHDR"
    assertEquals(decodedPng.chunks[1].type, new Uint8Array([80, 76, 84, 69])); // "PLTE"
    assertEquals(decodedPng.chunks[2].type, new Uint8Array([73, 68, 65, 84])); // "IDAT"
    assertEquals(decodedPng.chunks[3].type, new Uint8Array([73, 69, 78, 68])); // "IEND"
  });
});

Deno.test("PNG chunk encoding and decoding", async (t) => {
  await t.step("IHDR chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 13,
      type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
      data: new Uint8Array([0, 0, 0, 1, 0, 0, 0, 1, 8, 2, 0, 0, 0]),
      crc: 0x12345678,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("PLTE chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 9,
      type: new Uint8Array([80, 76, 84, 69]), // "PLTE"
      data: new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255]),
      crc: 0x87654321,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("IDAT chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 10,
      type: new Uint8Array([73, 68, 65, 84]), // "IDAT"
      data: new Uint8Array([120, 156, 99, 96, 0, 0, 0, 0, 0, 0]),
      crc: 0x11111111,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("IEND chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 0,
      type: new Uint8Array([73, 69, 78, 68]), // "IEND"
      data: new Uint8Array(0),
      crc: 0xAE426082,
    };

    const buffer = new Uint8Array(16);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("tRNS chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 1,
      type: new Uint8Array([116, 82, 78, 83]), // "tRNS"
      data: new Uint8Array([255]),
      crc: 0x22222222,
    };

    const buffer = new Uint8Array(16);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("gAMA chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 4,
      type: new Uint8Array([103, 65, 77, 65]), // "gAMA"
      data: new Uint8Array([0, 0, 177, 47]), // 45455 in big-endian
      crc: 0x33333333,
    };

    const buffer = new Uint8Array(16);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("cHRM chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 32,
      type: new Uint8Array([99, 72, 82, 77]), // "cHRM"
      data: new Uint8Array([
        0,
        0,
        122,
        38, // whitePointX: 31270
        0,
        0,
        128,
        84, // whitePointY: 32900
        0,
        0,
        250,
        0, // redX: 64000
        0,
        0,
        129,
        24, // redY: 33000
        0,
        0,
        117,
        48, // greenX: 30000
        0,
        0,
        234,
        96, // greenY: 60000
        0,
        0,
        58,
        224, // blueX: 15000
        0,
        0,
        23,
        112, // blueY: 6000
      ]),
      crc: 0x44444444,
    };

    const buffer = new Uint8Array(48);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("sRGB chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 1,
      type: new Uint8Array([115, 82, 71, 66]), // "sRGB"
      data: new Uint8Array([0]), // Perceptual rendering intent
      crc: 0x55555555,
    };

    const buffer = new Uint8Array(16);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("iCCP chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 8,
      type: new Uint8Array([105, 67, 67, 80]), // "iCCP"
      data: new Uint8Array([115, 82, 71, 66, 0, 0, 120, 156]), // "sRGB" + null + compression method + compressed data
      crc: 0x66666666,
    };

    const buffer = new Uint8Array(20);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("tEXt chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 10,
      type: new Uint8Array([116, 69, 88, 116]), // "tEXt"
      data: new Uint8Array([84, 105, 116, 108, 101, 0, 84, 101, 115, 116]), // "Title" + null + "Test"
      crc: 0x77777777,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("zTXt chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 9,
      type: new Uint8Array([122, 84, 88, 116]), // "zTXt"
      data: new Uint8Array([67, 111, 109, 109, 101, 110, 116, 0, 120]), // "Comment" + null + compression method + compressed data
      crc: 0x88888888,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("bKGD chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 3,
      type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
      data: new Uint8Array([255, 0, 0]), // Red background
      crc: 0x99999999,
    };

    const buffer = new Uint8Array(16);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("pHYs chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 9,
      type: new Uint8Array([112, 72, 89, 115]), // "pHYs"
      data: new Uint8Array([
        0,
        0,
        11,
        3, // pixelsPerUnitX: 2835 (72 DPI)
        0,
        0,
        11,
        3, // pixelsPerUnitY: 2835
        1, // unitSpecifier: meter
      ]),
      crc: 0xAAAAAAAA,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });

  await t.step("tIME chunk", () => {
    const chunkCoder = pngChunk();
    const testChunk: PngChunk = {
      length: 7,
      type: new Uint8Array([116, 73, 77, 69]), // "tIME"
      data: new Uint8Array([0, 7, 228, 12, 25, 10, 30]),
      crc: 0xBBBBBBBB,
    };

    const buffer = new Uint8Array(32);
    const bytesWritten = chunkCoder.encode(testChunk, buffer);
    const [decodedChunk, bytesRead] = chunkCoder.decode(buffer);

    assertEquals(bytesRead, bytesWritten);
    assertEquals(decodedChunk.length, testChunk.length);
    assertEquals(decodedChunk.type, testChunk.type);
    assertEquals(decodedChunk.data, testChunk.data);
    assertEquals(decodedChunk.crc, testChunk.crc);
  });
});
