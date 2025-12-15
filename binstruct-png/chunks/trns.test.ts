import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type TrnsChunk, trnsChunkRefiner } from "./trns.ts";

// A. Basic refine/unrefine tests

Deno.test("trnsChunkRefiner() - refines grayscale tRNS chunk", () => {
  const refiner = trnsChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 2,
    type: new Uint8Array([116, 82, 78, 83]), // "tRNS"
    data: new Uint8Array([128, 0]), // Gray level 32768 as u16be
    crc: 0xAABBCCDD,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "tRNS");
  assertEquals(refined.length, 2);
  assertEquals(refined.data.values.length, 2);
  assertEquals(refined.data.values[0], 128);
  assertEquals(refined.data.values[1], 0);
  assertEquals(refined.crc, 0xAABBCCDD);
});

Deno.test("trnsChunkRefiner() - refines RGB tRNS chunk", () => {
  const refiner = trnsChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 6,
    type: new Uint8Array([116, 82, 78, 83]), // "tRNS"
    // deno-fmt-ignore
    data: new Uint8Array([
      255, 255, // Red: 65535
      128, 0,   // Green: 32768
      0, 0,     // Blue: 0
    ]),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "tRNS");
  assertEquals(refined.length, 6);
  assertEquals(refined.data.values.length, 6);
  assertEquals(refined.data.values, [255, 255, 128, 0, 0, 0]);
});

Deno.test("trnsChunkRefiner() - refines indexed tRNS chunk", () => {
  const refiner = trnsChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 3,
    type: new Uint8Array([116, 82, 78, 83]), // "tRNS"
    data: new Uint8Array([0, 128, 255]), // 3 alpha values
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "tRNS");
  assertEquals(refined.length, 3);
  assertEquals(refined.data.values, [0, 128, 255]);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("trnsChunkRefiner() - unrefines tRNS chunk", () => {
  const refiner = trnsChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: TrnsChunk = {
    length: 3,
    type: "tRNS",
    data: {
      values: [0, 128, 255],
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([116, 82, 78, 83])); // "tRNS"
  assertEquals(unrefined.length, 3);
  assertEquals(unrefined.data.length, 3);
  assertEquals(unrefined.data, new Uint8Array([0, 128, 255]));
  assertEquals(unrefined.crc, 0x11223344);
});

// B. Round-trip tests

Deno.test("trnsChunkRefiner() - round-trip grayscale transparency", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: TrnsChunk = {
    length: 2,
    type: "tRNS",
    data: {
      values: [128, 0], // Gray level 32768 (0x8000)
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, original.data.values);
  assertEquals(refined.crc, original.crc);
});

Deno.test("trnsChunkRefiner() - round-trip RGB transparency", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: TrnsChunk = {
    length: 6,
    type: "tRNS",
    data: {
      // deno-fmt-ignore
      values: [
        255, 255, // Red: 65535
        128, 0,   // Green: 32768
        0, 0,     // Blue: 0
      ],
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, original.data.values);
});

Deno.test("trnsChunkRefiner() - round-trip indexed with single alpha", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: TrnsChunk = {
    length: 1,
    type: "tRNS",
    data: {
      values: [128], // Single alpha value
    },
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, [128]);
});

Deno.test("trnsChunkRefiner() - round-trip indexed with multiple alphas", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: TrnsChunk = {
    length: 5,
    type: "tRNS",
    data: {
      values: [0, 64, 128, 192, 255],
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, [0, 64, 128, 192, 255]);
});

Deno.test("trnsChunkRefiner() - round-trip full palette (256 alphas)", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const alphas: number[] = [];
  for (let i = 0; i < 256; i++) {
    alphas.push(i);
  }

  const original: TrnsChunk = {
    length: 256,
    type: "tRNS",
    data: { values: alphas },
    crc: 0xFFEEDDCC,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.values.length, 256);
  assertEquals(refined.data.values[0], 0);
  assertEquals(refined.data.values[127], 127);
  assertEquals(refined.data.values[255], 255);
});

// C. Edge cases

Deno.test("trnsChunkRefiner() - empty indexed transparency", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: TrnsChunk = {
    length: 0,
    type: "tRNS",
    data: {
      values: [], // Empty - all palette entries default to opaque
    },
    crc: 0x00000000,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.values, []);
});

Deno.test("trnsChunkRefiner() - partial palette transparency (various sizes)", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testSizes = [1, 2, 3, 5, 10, 50, 128, 200];

  for (const size of testSizes) {
    const values: number[] = [];
    for (let i = 0; i < size; i++) {
      values.push((i * 255) % 256);
    }

    const original: TrnsChunk = {
      length: size,
      type: "tRNS",
      data: { values },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values.length, size);
    assertEquals(refined.data.values, values);
  }
});

Deno.test("trnsChunkRefiner() - grayscale at bit depth boundaries", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test boundary values for different bit depths
  const testCases: [number, number][] = [
    [0, 0], // Minimum value
    [0, 255], // 8-bit max
    [255, 255], // 16-bit max
  ];

  for (const [byte0, byte1] of testCases) {
    const original: TrnsChunk = {
      length: 2,
      type: "tRNS",
      data: {
        values: [byte0, byte1],
      },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, [byte0, byte1]);
  }
});

Deno.test("trnsChunkRefiner() - RGB transparency with extreme values", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCases: number[][] = [
    [0, 0, 0, 0, 0, 0], // Black
    [255, 255, 255, 255, 255, 255], // White
    [255, 255, 0, 0, 0, 0], // Pure red
    [0, 0, 255, 255, 0, 0], // Pure green
    [0, 0, 0, 0, 255, 255], // Pure blue
  ];

  for (const values of testCases) {
    const original: TrnsChunk = {
      length: 6,
      type: "tRNS",
      data: { values },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, values);
  }
});

Deno.test("trnsChunkRefiner() - multiple round-trips consistency", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: TrnsChunk = {
    length: 5,
    type: "tRNS",
    data: {
      values: [0, 64, 128, 192, 255],
    },
    crc: 0xAABBCCDD,
  };

  // Perform 3 round-trips
  let current = original;
  for (let i = 0; i < 3; i++) {
    const unrefined = refiner.unrefine(current, encodeContext);
    current = refiner.refine(unrefined, decodeContext);
  }

  assertEquals(current.type, original.type);
  assertEquals(current.data.values, original.data.values);
  assertEquals(current.crc, original.crc);
});

Deno.test("trnsChunkRefiner() - preserves exact byte values", () => {
  const refiner = trnsChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test with specific byte patterns
  const testPatterns: number[][] = [
    [0, 1, 2, 3, 4, 5],
    [250, 251, 252, 253, 254, 255],
    [127, 128, 129],
    [0, 255, 0, 255],
    [85, 170, 85, 170],
  ];

  for (const values of testPatterns) {
    const original: TrnsChunk = {
      length: values.length,
      type: "tRNS",
      data: { values },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, values);

    // Verify byte-level accuracy
    for (let i = 0; i < values.length; i++) {
      assertEquals(refined.data.values[i], values[i]);
    }
  }
});
