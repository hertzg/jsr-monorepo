import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type IendChunk, iendChunkRefiner } from "./iend.ts";

Deno.test("iendChunkRefiner() - refines IEND chunk", () => {
  const refiner = iendChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 0,
    type: new Uint8Array([73, 69, 78, 68]), // "IEND"
    data: new Uint8Array(0),
    crc: 0xAE426082,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "IEND");
  assertEquals(refined.length, 0);
  assertEquals(refined.crc, 0xAE426082);
});

Deno.test("iendChunkRefiner() - unrefines IEND chunk", () => {
  const refiner = iendChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: IendChunk = {
    length: 0,
    type: "IEND",
    crc: 0xAE426082,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([73, 69, 78, 68])); // "IEND"
  assertEquals(unrefined.length, 0);
  assertEquals(unrefined.data, new Uint8Array(0));
  assertEquals(unrefined.crc, 0xAE426082);
});

Deno.test("iendChunkRefiner() - round-trip with standard CRC", () => {
  const refiner = iendChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IendChunk = {
    length: 0,
    type: "IEND",
    crc: 0xAE426082, // Standard IEND CRC
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.crc, original.crc);
});

Deno.test("iendChunkRefiner() - round-trip with different CRC", () => {
  const refiner = iendChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test with a non-standard CRC (though this wouldn't be valid in a real PNG)
  const original: IendChunk = {
    length: 0,
    type: "IEND",
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.length, original.length);
  assertEquals(refined.crc, original.crc);
});

Deno.test("iendChunkRefiner() - always produces empty data when unrefining", () => {
  const refiner = iendChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: IendChunk = {
    length: 0,
    type: "IEND",
    crc: 0xAE426082,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.data.length, 0);
  assertEquals(unrefined.data, new Uint8Array(0));
});

Deno.test("iendChunkRefiner() - preserves CRC through round-trip", () => {
  const refiner = iendChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // deno-fmt-ignore
  const testCrcs = [
    0xAE426082, // Standard
    0x00000000,
    0xFFFFFFFF,
    0x12345678,
    0xABCDEF01,
  ];

  for (const crc of testCrcs) {
    const original: IendChunk = {
      length: 0,
      type: "IEND",
      crc,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.crc, crc);
  }
});

Deno.test("iendChunkRefiner() - refine ignores data field", () => {
  const refiner = iendChunkRefiner();
  const context = createContext("decode");

  // IEND should have no data, but test that refine handles it if present
  const unknownChunk: PngChunkUnknown = {
    length: 0,
    type: new Uint8Array([73, 69, 78, 68]), // "IEND"
    data: new Uint8Array([1, 2, 3]), // Invalid: IEND should have no data
    crc: 0xAE426082,
  };

  const refined = refiner.refine(unknownChunk, context);

  // The refined chunk should not include a data field
  assertEquals(refined.type, "IEND");
  assertEquals(refined.length, 0);
  assertEquals(refined.crc, 0xAE426082);
  assertEquals("data" in refined, false);
});

Deno.test("iendChunkRefiner() - length is always 0", () => {
  const refiner = iendChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IendChunk = {
    length: 0,
    type: "IEND",
    crc: 0xAE426082,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.length, 0);
  assertEquals(unrefined.length, 0);
});

Deno.test("iendChunkRefiner() - type is preserved as string", () => {
  const refiner = iendChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 0,
    type: new Uint8Array([73, 69, 78, 68]), // "IEND"
    data: new Uint8Array(0),
    crc: 0xAE426082,
  };

  const refined = refiner.refine(unknownChunk, context);

  // Type should be the string "IEND", not bytes
  assertEquals(refined.type, "IEND");
  assertEquals(typeof refined.type, "string");
});

Deno.test("iendChunkRefiner() - multiple round-trips are consistent", () => {
  const refiner = iendChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: IendChunk = {
    length: 0,
    type: "IEND",
    crc: 0xAE426082,
  };

  // Perform multiple round-trips
  let current = original;
  for (let i = 0; i < 3; i++) {
    const unrefined = refiner.unrefine(current, encodeContext);
    current = refiner.refine(unrefined, decodeContext);
  }

  assertEquals(current.type, original.type);
  assertEquals(current.length, original.length);
  assertEquals(current.crc, original.crc);
});
