import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type IhdrChunk, ihdrChunkRefiner } from "./ihdr.ts";

Deno.test("ihdrChunkRefiner() - refines IHDR chunk", () => {
  const refiner = ihdrChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 13,
    type: new Uint8Array([73, 72, 68, 82]), // "IHDR"
    // deno-fmt-ignore
    data: new Uint8Array([
      0, 0, 0, 100, // width: 100
      0, 0, 0, 200, // height: 200
      8, // bitDepth: 8
      2, // colorType: 2 (truecolor)
      0, // compressionMethod: 0
      0, // filterMethod: 0
      0, // interlaceMethod: 0
    ]),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "IHDR");
  assertEquals(refined.length, 13);
  assertEquals(refined.data.width, 100);
  assertEquals(refined.data.height, 200);
  assertEquals(refined.data.bitDepth, 8);
  assertEquals(refined.data.colorType, 2);
  assertEquals(refined.data.compressionMethod, 0);
  assertEquals(refined.data.filterMethod, 0);
  assertEquals(refined.data.interlaceMethod, 0);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("ihdrChunkRefiner() - unrefines IHDR chunk", () => {
  const refiner = ihdrChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: IhdrChunk = {
    length: 13,
    type: "IHDR",
    data: {
      width: 100,
      height: 200,
      bitDepth: 8,
      colorType: 2,
      compressionMethod: 0,
      filterMethod: 0,
      interlaceMethod: 0,
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([73, 72, 68, 82])); // "IHDR"
  assertEquals(unrefined.length, 13);
  assertEquals(unrefined.data.length, 13);
  assertEquals(unrefined.crc, 0x12345678);
});

Deno.test("ihdrChunkRefiner() - round-trip with 1x1 image", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IhdrChunk = {
    length: 13,
    type: "IHDR",
    data: {
      width: 1,
      height: 1,
      bitDepth: 8,
      colorType: 2,
      compressionMethod: 0,
      filterMethod: 0,
      interlaceMethod: 0,
    },
    crc: 0x907753DE,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.width, original.data.width);
  assertEquals(refined.data.height, original.data.height);
  assertEquals(refined.data.bitDepth, original.data.bitDepth);
  assertEquals(refined.data.colorType, original.data.colorType);
  assertEquals(refined.data.compressionMethod, original.data.compressionMethod);
  assertEquals(refined.data.filterMethod, original.data.filterMethod);
  assertEquals(refined.data.interlaceMethod, original.data.interlaceMethod);
  assertEquals(refined.crc, original.crc);
});

Deno.test("ihdrChunkRefiner() - round-trip with large dimensions", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IhdrChunk = {
    length: 13,
    type: "IHDR",
    data: {
      width: 1920,
      height: 1080,
      bitDepth: 8,
      colorType: 6, // truecolor with alpha
      compressionMethod: 0,
      filterMethod: 0,
      interlaceMethod: 1, // Adam7 interlace
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.width, original.data.width);
  assertEquals(refined.data.height, original.data.height);
  assertEquals(refined.data.bitDepth, original.data.bitDepth);
  assertEquals(refined.data.colorType, original.data.colorType);
  assertEquals(refined.data.compressionMethod, original.data.compressionMethod);
  assertEquals(refined.data.filterMethod, original.data.filterMethod);
  assertEquals(refined.data.interlaceMethod, original.data.interlaceMethod);
});

Deno.test("ihdrChunkRefiner() - round-trip with grayscale", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IhdrChunk = {
    length: 13,
    type: "IHDR",
    data: {
      width: 256,
      height: 256,
      bitDepth: 16,
      colorType: 0, // grayscale
      compressionMethod: 0,
      filterMethod: 0,
      interlaceMethod: 0,
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.width, original.data.width);
  assertEquals(refined.data.height, original.data.height);
  assertEquals(refined.data.bitDepth, original.data.bitDepth);
  assertEquals(refined.data.colorType, original.data.colorType);
});

Deno.test("ihdrChunkRefiner() - round-trip with indexed color", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IhdrChunk = {
    length: 13,
    type: "IHDR",
    data: {
      width: 64,
      height: 64,
      bitDepth: 8,
      colorType: 3, // indexed color (palette)
      compressionMethod: 0,
      filterMethod: 0,
      interlaceMethod: 0,
    },
    crc: 0xFFEEDDCC,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.width, original.data.width);
  assertEquals(refined.data.height, original.data.height);
  assertEquals(refined.data.bitDepth, original.data.bitDepth);
  assertEquals(refined.data.colorType, original.data.colorType);
});

Deno.test("ihdrChunkRefiner() - all bit depths", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const bitDepths = [1, 2, 4, 8, 16];

  for (const bitDepth of bitDepths) {
    const original: IhdrChunk = {
      length: 13,
      type: "IHDR",
      data: {
        width: 32,
        height: 32,
        bitDepth,
        colorType: 0, // grayscale supports all bit depths
        compressionMethod: 0,
        filterMethod: 0,
        interlaceMethod: 0,
      },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.bitDepth, bitDepth);
  }
});

Deno.test("ihdrChunkRefiner() - all color types", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const colorTypes = [
    0, // grayscale
    2, // truecolor
    3, // indexed
    4, // grayscale with alpha
    6, // truecolor with alpha
  ];

  for (const colorType of colorTypes) {
    const original: IhdrChunk = {
      length: 13,
      type: "IHDR",
      data: {
        width: 32,
        height: 32,
        bitDepth: 8,
        colorType,
        compressionMethod: 0,
        filterMethod: 0,
        interlaceMethod: 0,
      },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.colorType, colorType);
  }
});

Deno.test("ihdrChunkRefiner() - both interlace methods", () => {
  const refiner = ihdrChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  for (const interlaceMethod of [0, 1]) {
    const original: IhdrChunk = {
      length: 13,
      type: "IHDR",
      data: {
        width: 100,
        height: 100,
        bitDepth: 8,
        colorType: 2,
        compressionMethod: 0,
        filterMethod: 0,
        interlaceMethod,
      },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.interlaceMethod, interlaceMethod);
  }
});
