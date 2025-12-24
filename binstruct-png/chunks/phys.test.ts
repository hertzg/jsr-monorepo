import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type PhysChunk, physChunkRefiner } from "./phys.ts";

// A. Basic refine/unrefine tests

Deno.test("physChunkRefiner() - refines pHYs chunk with unit=0 (aspect ratio)", () => {
  const refiner = physChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 9,
    type: new Uint8Array([112, 72, 89, 115]), // "pHYs"
    // deno-fmt-ignore
    data: new Uint8Array([
      0x00, 0x00, 0x00, 0x10,  // pixelsPerUnitX: 16
      0x00, 0x00, 0x00, 0x09,  // pixelsPerUnitY: 9
      0x00,                    // unit: 0 (unknown/aspect ratio)
    ]),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "pHYs");
  assertEquals(refined.length, 9);
  assertEquals(refined.data.pixelsPerUnitX, 16);
  assertEquals(refined.data.pixelsPerUnitY, 9);
  assertEquals(refined.data.unit, 0);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("physChunkRefiner() - refines pHYs chunk with unit=1 (96 DPI)", () => {
  const refiner = physChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 9,
    type: new Uint8Array([112, 72, 89, 115]), // "pHYs"
    // deno-fmt-ignore
    data: new Uint8Array([
      0x00, 0x00, 0x0E, 0xC4,  // pixelsPerUnitX: 3780 (96 DPI)
      0x00, 0x00, 0x0E, 0xC4,  // pixelsPerUnitY: 3780 (96 DPI)
      0x01,                    // unit: 1 (meter)
    ]),
    crc: 0xAABBCCDD,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "pHYs");
  assertEquals(refined.length, 9);
  assertEquals(refined.data.pixelsPerUnitX, 3780);
  assertEquals(refined.data.pixelsPerUnitY, 3780);
  assertEquals(refined.data.unit, 1);
  assertEquals(refined.crc, 0xAABBCCDD);
});

Deno.test("physChunkRefiner() - unrefines pHYs chunk", () => {
  const refiner = physChunkRefiner();
  const context = createContext("encode");

  const physChunk: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 11811, // 300 DPI
      pixelsPerUnitY: 11811, // 300 DPI
      unit: 1, // meter
    },
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(physChunk, context);

  assertEquals(unrefined.type, new Uint8Array([112, 72, 89, 115])); // "pHYs"
  assertEquals(unrefined.length, 9);
  assertEquals(unrefined.data.length, 9);
  // deno-fmt-ignore
  assertEquals(unrefined.data, new Uint8Array([
    0x00, 0x00, 0x2E, 0x23,  // 11811 as u32be
    0x00, 0x00, 0x2E, 0x23,  // 11811 as u32be
    0x01,                    // unit: 1
  ]));
  assertEquals(unrefined.crc, 0x99887766);
});

// B. Round-trip tests

Deno.test("physChunkRefiner() - round-trip with aspect ratio (unit=0)", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 16,
      pixelsPerUnitY: 9,
      unit: 0, // aspect ratio only
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.pixelsPerUnitX, original.data.pixelsPerUnitX);
  assertEquals(refined.data.pixelsPerUnitY, original.data.pixelsPerUnitY);
  assertEquals(refined.data.unit, original.data.unit);
  assertEquals(refined.crc, original.crc);
});

Deno.test("physChunkRefiner() - round-trip with 96 DPI (3780 PPM)", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 3780,
      pixelsPerUnitY: 3780,
      unit: 1, // meter
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.pixelsPerUnitX, original.data.pixelsPerUnitX);
  assertEquals(refined.data.pixelsPerUnitY, original.data.pixelsPerUnitY);
  assertEquals(refined.data.unit, original.data.unit);
  assertEquals(refined.crc, original.crc);
});

Deno.test("physChunkRefiner() - round-trip with 300 DPI (11811 PPM)", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 11811,
      pixelsPerUnitY: 11811,
      unit: 1, // meter
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.pixelsPerUnitX, original.data.pixelsPerUnitX);
  assertEquals(refined.data.pixelsPerUnitY, original.data.pixelsPerUnitY);
  assertEquals(refined.data.unit, original.data.unit);
  assertEquals(refined.crc, original.crc);
});

Deno.test("physChunkRefiner() - round-trip with different X/Y values", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 3780,  // 96 DPI horizontal
      pixelsPerUnitY: 2835,  // 72 DPI vertical
      unit: 1, // meter
    },
    crc: 0xDDEEFF00,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.pixelsPerUnitX, original.data.pixelsPerUnitX);
  assertEquals(refined.data.pixelsPerUnitY, original.data.pixelsPerUnitY);
  assertEquals(refined.data.unit, original.data.unit);
  assertEquals(refined.crc, original.crc);
});

Deno.test("physChunkRefiner() - multiple round-trips consistency", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 5906,  // 150 DPI
      pixelsPerUnitY: 5906,  // 150 DPI
      unit: 1,
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
  assertEquals(current.data.pixelsPerUnitX, original.data.pixelsPerUnitX);
  assertEquals(current.data.pixelsPerUnitY, original.data.pixelsPerUnitY);
  assertEquals(current.data.unit, original.data.unit);
  assertEquals(current.crc, original.crc);
});

// C. Edge cases

Deno.test("physChunkRefiner() - minimum values (1, 1, 0)", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 1,
      pixelsPerUnitY: 1,
      unit: 0,
    },
    crc: 0x00000000,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.pixelsPerUnitX, 1);
  assertEquals(refined.data.pixelsPerUnitY, 1);
  assertEquals(refined.data.unit, 0);
  // deno-fmt-ignore
  assertEquals(unrefined.data, new Uint8Array([
    0x00, 0x00, 0x00, 0x01,
    0x00, 0x00, 0x00, 0x01,
    0x00,
  ]));
});

Deno.test("physChunkRefiner() - maximum values (0xFFFFFFFF, 0xFFFFFFFF, 1)", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PhysChunk = {
    length: 9,
    type: "pHYs",
    data: {
      pixelsPerUnitX: 0xFFFFFFFF,
      pixelsPerUnitY: 0xFFFFFFFF,
      unit: 1,
    },
    crc: 0xFFFFFFFF,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.pixelsPerUnitX, 0xFFFFFFFF);
  assertEquals(refined.data.pixelsPerUnitY, 0xFFFFFFFF);
  assertEquals(refined.data.unit, 1);
  // deno-fmt-ignore
  assertEquals(unrefined.data, new Uint8Array([
    0xFF, 0xFF, 0xFF, 0xFF,
    0xFF, 0xFF, 0xFF, 0xFF,
    0x01,
  ]));
});

Deno.test("physChunkRefiner() - common DPI values round-trip", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const commonDPIValues = [
    { dpi: 72, ppm: 2835 },
    { dpi: 96, ppm: 3780 },
    { dpi: 150, ppm: 5906 },
    { dpi: 300, ppm: 11811 },
    { dpi: 600, ppm: 23622 },
  ];

  for (const { ppm } of commonDPIValues) {
    const original: PhysChunk = {
      length: 9,
      type: "pHYs",
      data: {
        pixelsPerUnitX: ppm,
        pixelsPerUnitY: ppm,
        unit: 1,
      },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.pixelsPerUnitX, ppm);
    assertEquals(refined.data.pixelsPerUnitY, ppm);
    assertEquals(refined.data.unit, 1);
  }
});

Deno.test("physChunkRefiner() - CRC preservation through round-trip", () => {
  const refiner = physChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCRCs = [0x00000000, 0xFFFFFFFF, 0x12345678, 0xAABBCCDD, 0x99887766];

  for (const crc of testCRCs) {
    const original: PhysChunk = {
      length: 9,
      type: "pHYs",
      data: {
        pixelsPerUnitX: 3780,
        pixelsPerUnitY: 3780,
        unit: 1,
      },
      crc: crc,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.crc, crc);
  }
});
