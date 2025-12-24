import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type SrgbChunk, srgbChunkRefiner } from "./srgb.ts";

// A. Basic refine/unrefine tests

Deno.test("srgbChunkRefiner() - refines sRGB chunk with perceptual intent (0)", () => {
  const refiner = srgbChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 1,
    type: new Uint8Array([115, 82, 71, 66]), // "sRGB"
    data: new Uint8Array([0]), // Perceptual
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "sRGB");
  assertEquals(refined.length, 1);
  assertEquals(refined.data.renderingIntent, 0);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("srgbChunkRefiner() - refines sRGB chunk with relative colorimetric intent (1)", () => {
  const refiner = srgbChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 1,
    type: new Uint8Array([115, 82, 71, 66]), // "sRGB"
    data: new Uint8Array([1]), // Relative colorimetric
    crc: 0xAABBCCDD,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "sRGB");
  assertEquals(refined.length, 1);
  assertEquals(refined.data.renderingIntent, 1);
  assertEquals(refined.crc, 0xAABBCCDD);
});

Deno.test("srgbChunkRefiner() - refines sRGB chunk with saturation intent (2)", () => {
  const refiner = srgbChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 1,
    type: new Uint8Array([115, 82, 71, 66]), // "sRGB"
    data: new Uint8Array([2]), // Saturation
    crc: 0x99887766,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "sRGB");
  assertEquals(refined.length, 1);
  assertEquals(refined.data.renderingIntent, 2);
  assertEquals(refined.crc, 0x99887766);
});

Deno.test("srgbChunkRefiner() - refines sRGB chunk with absolute colorimetric intent (3)", () => {
  const refiner = srgbChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 1,
    type: new Uint8Array([115, 82, 71, 66]), // "sRGB"
    data: new Uint8Array([3]), // Absolute colorimetric
    crc: 0x11223344,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "sRGB");
  assertEquals(refined.length, 1);
  assertEquals(refined.data.renderingIntent, 3);
  assertEquals(refined.crc, 0x11223344);
});

Deno.test("srgbChunkRefiner() - unrefines sRGB chunk", () => {
  const refiner = srgbChunkRefiner();
  const context = createContext("encode");

  const srgbChunk: SrgbChunk = {
    length: 1,
    type: "sRGB",
    data: {
      renderingIntent: 1, // Relative colorimetric
    },
    crc: 0xDDEEFF00,
  };

  const unrefined = refiner.unrefine(srgbChunk, context);

  assertEquals(unrefined.type, new Uint8Array([115, 82, 71, 66])); // "sRGB"
  assertEquals(unrefined.length, 1);
  assertEquals(unrefined.data.length, 1);
  assertEquals(unrefined.data[0], 1);
  assertEquals(unrefined.crc, 0xDDEEFF00);
});

// B. Round-trip tests

Deno.test("srgbChunkRefiner() - round-trip with perceptual intent (0)", () => {
  const refiner = srgbChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: SrgbChunk = {
    length: 1,
    type: "sRGB",
    data: {
      renderingIntent: 0,
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.renderingIntent, original.data.renderingIntent);
  assertEquals(refined.crc, original.crc);
});

Deno.test("srgbChunkRefiner() - round-trip with all four rendering intents", () => {
  const refiner = srgbChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const renderingIntents = [0, 1, 2, 3];

  for (const intent of renderingIntents) {
    const original: SrgbChunk = {
      length: 1,
      type: "sRGB",
      data: {
        renderingIntent: intent,
      },
      crc: 0xAABBCCDD,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.type, original.type);
    assertEquals(refined.data.renderingIntent, intent);
    assertEquals(refined.crc, original.crc);
  }
});

Deno.test("srgbChunkRefiner() - multiple round-trips consistency", () => {
  const refiner = srgbChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: SrgbChunk = {
    length: 1,
    type: "sRGB",
    data: {
      renderingIntent: 2,
    },
    crc: 0x99887766,
  };

  // Perform 3 round-trips
  let current = original;
  for (let i = 0; i < 3; i++) {
    const unrefined = refiner.unrefine(current, encodeContext);
    current = refiner.refine(unrefined, decodeContext);
  }

  assertEquals(current.type, original.type);
  assertEquals(current.data.renderingIntent, original.data.renderingIntent);
  assertEquals(current.crc, original.crc);
});

// C. Edge cases

Deno.test("srgbChunkRefiner() - CRC preservation through round-trip", () => {
  const refiner = srgbChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCRCs = [0x00000000, 0xFFFFFFFF, 0x12345678, 0xAABBCCDD, 0x99887766];

  for (const crc of testCRCs) {
    const original: SrgbChunk = {
      length: 1,
      type: "sRGB",
      data: { renderingIntent: 0 },
      crc: crc,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.crc, crc);
  }
});

Deno.test("srgbChunkRefiner() - exact byte value preservation", () => {
  const refiner = srgbChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCases: [number, number][] = [
    [0, 0], // Perceptual
    [1, 1], // Relative colorimetric
    [2, 2], // Saturation
    [3, 3], // Absolute colorimetric
  ];

  for (const [renderingIntent, expectedByte] of testCases) {
    const original: SrgbChunk = {
      length: 1,
      type: "sRGB",
      data: { renderingIntent },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.renderingIntent, renderingIntent);
    assertEquals(unrefined.data[0], expectedByte);
  }
});
