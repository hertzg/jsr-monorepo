import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type IdatChunk, idatChunkRefiner } from "./idat.ts";

Deno.test("idatChunkRefiner() - refines IDAT chunk", () => {
  const refiner = idatChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 10,
    type: new Uint8Array([73, 68, 65, 84]), // "IDAT"
    // deno-fmt-ignore
    data: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "IDAT");
  assertEquals(refined.length, 10);
  // deno-fmt-ignore
  assertEquals(refined.data, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("idatChunkRefiner() - unrefines IDAT chunk", () => {
  const refiner = idatChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: IdatChunk = {
    length: 5,
    type: "IDAT",
    data: new Uint8Array([1, 2, 3, 4, 5]),
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([73, 68, 65, 84])); // "IDAT"
  assertEquals(unrefined.length, 5);
  assertEquals(unrefined.data, new Uint8Array([1, 2, 3, 4, 5]));
  assertEquals(unrefined.crc, 0xAABBCCDD);
});

Deno.test("idatChunkRefiner() - round-trip with empty data", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IdatChunk = {
    length: 0,
    type: "IDAT",
    data: new Uint8Array(0),
    crc: 0x00000000,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data, original.data);
  assertEquals(refined.crc, original.crc);
});

Deno.test("idatChunkRefiner() - round-trip with small data", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IdatChunk = {
    length: 5,
    type: "IDAT",
    data: new Uint8Array([1, 2, 3, 4, 5]),
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data, original.data);
  assertEquals(refined.crc, original.crc);
});

Deno.test("idatChunkRefiner() - round-trip with compressed data", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Simulated compressed data (ZLIB header + deflate data)
  // deno-fmt-ignore
  const compressedData = new Uint8Array([
    0x78, 0x9C, // ZLIB header
    0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // deflate data
  ]);

  const original: IdatChunk = {
    length: compressedData.length,
    type: "IDAT",
    data: compressedData,
    crc: 0xFFEEDDCC,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data, original.data);
  assertEquals(refined.crc, original.crc);
});

Deno.test("idatChunkRefiner() - round-trip with large data", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Create a large data block
  const largeData = new Uint8Array(8192);
  for (let i = 0; i < largeData.length; i++) {
    largeData[i] = i % 256;
  }

  const original: IdatChunk = {
    length: largeData.length,
    type: "IDAT",
    data: largeData,
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data, original.data);
  assertEquals(refined.crc, original.crc);
});

Deno.test("idatChunkRefiner() - preserves data bytes exactly", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test with various byte patterns
  // deno-fmt-ignore
  const testPatterns = [
    new Uint8Array([0, 0, 0, 0]),
    new Uint8Array([255, 255, 255, 255]),
    new Uint8Array([0, 255, 0, 255]),
    new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
    new Uint8Array([128, 64, 32, 16, 8, 4, 2, 1]),
  ];

  for (const pattern of testPatterns) {
    const original: IdatChunk = {
      length: pattern.length,
      type: "IDAT",
      data: pattern,
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data, pattern);
  }
});

Deno.test("idatChunkRefiner() - handles multiple consecutive chunks", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // PNG files can have multiple IDAT chunks
  const chunks = [
    {
      length: 4,
      type: "IDAT" as const,
      data: new Uint8Array([1, 2, 3, 4]),
      crc: 0x11111111,
    },
    {
      length: 6,
      type: "IDAT" as const,
      data: new Uint8Array([5, 6, 7, 8, 9, 10]),
      crc: 0x22222222,
    },
    {
      length: 3,
      type: "IDAT" as const,
      data: new Uint8Array([11, 12, 13]),
      crc: 0x33333333,
    },
  ];

  for (const chunk of chunks) {
    const unrefined = refiner.unrefine(chunk, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.type, chunk.type);
    assertEquals(refined.data, chunk.data);
    assertEquals(refined.crc, chunk.crc);
  }
});
