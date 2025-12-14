import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type IdatChunk, idatChunkRefiner } from "./idat.ts";
import { deflateSync, inflateSync } from "node:zlib";
import { decodeHeader } from "../zlib.ts";

Deno.test("idatChunkRefiner() - refines IDAT chunk", () => {
  const refiner = idatChunkRefiner();
  const context = createContext("decode");

  const uncompressed = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const unknownChunk: PngChunkUnknown = {
    length: 10,
    type: new Uint8Array([73, 68, 65, 84]), // "IDAT"
    // deno-fmt-ignore
    data: new Uint8Array(deflateSync(uncompressed)),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "IDAT");
  assertEquals(refined.length, 10);
  assertEquals(refined.data.uncompressed, uncompressed);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("idatChunkRefiner() - unrefines IDAT chunk", () => {
  const refiner = idatChunkRefiner();
  const context = createContext("encode");

  const uncompressed = new TextEncoder().encode("abcd");

  // deno-fmt-ignore
  const compressedOriginal = new Uint8Array(deflateSync(uncompressed));
  const head = compressedOriginal.subarray(0, 2);
  const checksum = compressedOriginal.subarray(-4);

  const refinedChunk: IdatChunk = {
    length: 5,
    type: "IDAT",
    data: {
      header: decodeHeader(Array.from(head)),
      uncompressed: uncompressed,
      checksum: checksum,
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([73, 68, 65, 84])); // "IDAT"
  assertEquals(unrefined.length, 5);
  assertEquals(unrefined.data, compressedOriginal);
  assertEquals(unrefined.crc, 0xAABBCCDD);
});

Deno.test("idatChunkRefiner() - round-trip with empty data", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const uncompressed = new Uint8Array(0);
  const compressedData = new Uint8Array(deflateSync(uncompressed));

  const original: IdatChunk = {
    length: 0,
    type: "IDAT",
    data: {
      header: decodeHeader(Array.from(compressedData.subarray(0, 2))),
      uncompressed: uncompressed,
      checksum: compressedData.subarray(-4),
    },
    crc: 0x00000000,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data.uncompressed, original.data.uncompressed);
  assertEquals(refined.crc, original.crc);
});

Deno.test("idatChunkRefiner() - round-trip with small data", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const uncompressed = new Uint8Array([1, 2, 3, 4, 5]);
  const compressedData = new Uint8Array(deflateSync(uncompressed));

  const original: IdatChunk = {
    length: 5,
    type: "IDAT",
    data: {
      header: decodeHeader(Array.from(compressedData.subarray(0, 2))),
      uncompressed: uncompressed,
      checksum: compressedData.subarray(-4),
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data.uncompressed, original.data.uncompressed);
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
    0x63, 0x60, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, // deflate data + checksum
  ]);

  // Decompress to get the original uncompressed data
  const uncompressed = new Uint8Array(inflateSync(compressedData));

  const original: IdatChunk = {
    length: compressedData.length,
    type: "IDAT",
    data: {
      header: decodeHeader([0x78, 0x9C]),
      uncompressed: uncompressed,
      checksum: compressedData.subarray(-4),
    },
    crc: 0xFFEEDDCC,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data.uncompressed, original.data.uncompressed);
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

  const compressedData = new Uint8Array(deflateSync(largeData));

  const original: IdatChunk = {
    length: largeData.length,
    type: "IDAT",
    data: {
      header: decodeHeader(Array.from(compressedData.subarray(0, 2))),
      uncompressed: largeData,
      checksum: compressedData.subarray(-4),
    },
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.data.uncompressed, original.data.uncompressed);
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
    const compressedData = new Uint8Array(deflateSync(pattern));

    const original: IdatChunk = {
      length: pattern.length,
      type: "IDAT",
      data: {
        header: decodeHeader(Array.from(compressedData.subarray(0, 2))),
        uncompressed: pattern,
        checksum: compressedData.subarray(-4),
      },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.uncompressed, pattern);
  }
});

Deno.test("idatChunkRefiner() - handles multiple consecutive chunks", () => {
  const refiner = idatChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // PNG files can have multiple IDAT chunks
  const uncompressedPatterns = [
    new Uint8Array([1, 2, 3, 4]),
    new Uint8Array([5, 6, 7, 8, 9, 10]),
    new Uint8Array([11, 12, 13]),
  ];

  const crcs = [0x11111111, 0x22222222, 0x33333333];

  const chunks: IdatChunk[] = uncompressedPatterns.map((uncompressed, i) => {
    const compressedData = new Uint8Array(deflateSync(uncompressed));

    return {
      length: uncompressed.length,
      type: "IDAT" as const,
      data: {
        header: decodeHeader(Array.from(compressedData.subarray(0, 2))),
        uncompressed: uncompressed,
        checksum: compressedData.subarray(-4),
      },
      crc: crcs[i],
    };
  });

  for (const chunk of chunks) {
    const unrefined = refiner.unrefine(chunk, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.type, chunk.type);
    assertEquals(refined.data.uncompressed, chunk.data.uncompressed);
    assertEquals(refined.crc, chunk.crc);
  }
});
