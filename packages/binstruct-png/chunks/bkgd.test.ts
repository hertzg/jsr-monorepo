import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type BkgdChunk, bkgdChunkRefiner } from "./bkgd.ts";

// A. Basic refine/unrefine tests

Deno.test("bkgdChunkRefiner() - refines grayscale bKGD chunk", () => {
  const refiner = bkgdChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 2,
    type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
    data: new Uint8Array([171, 132]), // Gray level 43908 as u16be
    crc: 0xAABBCCDD,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "bKGD");
  assertEquals(refined.length, 2);
  assertEquals(refined.data.values.length, 2);
  assertEquals(refined.data.values[0], 171);
  assertEquals(refined.data.values[1], 132);
  assertEquals(refined.crc, 0xAABBCCDD);
});

Deno.test("bkgdChunkRefiner() - refines RGB bKGD chunk", () => {
  const refiner = bkgdChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 6,
    type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
    // deno-fmt-ignore
    data: new Uint8Array([
      0, 255,     // Red: 255
      0, 255,     // Green: 255
      0, 255,     // Blue: 255 (white)
    ]),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "bKGD");
  assertEquals(refined.length, 6);
  assertEquals(refined.data.values.length, 6);
  assertEquals(refined.data.values, [0, 255, 0, 255, 0, 255]);
});

Deno.test("bkgdChunkRefiner() - refines indexed bKGD chunk", () => {
  const refiner = bkgdChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 1,
    type: new Uint8Array([98, 75, 71, 68]), // "bKGD"
    data: new Uint8Array([5]), // Palette index 5
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "bKGD");
  assertEquals(refined.length, 1);
  assertEquals(refined.data.values, [5]);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("bkgdChunkRefiner() - unrefines bKGD chunk", () => {
  const refiner = bkgdChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: BkgdChunk = {
    length: 2,
    type: "bKGD",
    data: {
      values: [128, 0],
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([98, 75, 71, 68])); // "bKGD"
  assertEquals(unrefined.length, 2);
  assertEquals(unrefined.data.length, 2);
  assertEquals(unrefined.data, new Uint8Array([128, 0]));
  assertEquals(unrefined.crc, 0x11223344);
});

// B. Round-trip tests

Deno.test("bkgdChunkRefiner() - round-trip grayscale background", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: BkgdChunk = {
    length: 2,
    type: "bKGD",
    data: {
      values: [171, 132], // Gray level 43908 (0xAB84)
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, original.data.values);
  assertEquals(refined.crc, original.crc);
});

Deno.test("bkgdChunkRefiner() - round-trip RGB background", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: BkgdChunk = {
    length: 6,
    type: "bKGD",
    data: {
      // deno-fmt-ignore
      values: [
        255, 255, // Red: 65535
        255, 255, // Green: 65535
        0, 0,     // Blue: 0 (yellow)
      ],
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, original.data.values);
});

Deno.test("bkgdChunkRefiner() - round-trip indexed with palette index 0", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: BkgdChunk = {
    length: 1,
    type: "bKGD",
    data: {
      values: [0], // First palette entry
    },
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, [0]);
});

Deno.test("bkgdChunkRefiner() - round-trip indexed with max palette index", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: BkgdChunk = {
    length: 1,
    type: "bKGD",
    data: {
      values: [255], // Last possible palette entry
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.values, [255]);
});

Deno.test("bkgdChunkRefiner() - multiple round-trips consistency", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: BkgdChunk = {
    length: 2,
    type: "bKGD",
    data: {
      values: [128, 0], // Gray level 32768
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

// C. Edge cases

Deno.test("bkgdChunkRefiner() - grayscale at bit depth boundaries", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test boundary values for different bit depths
  const testCases: [number, number][] = [
    [0, 0], // Minimum value (black)
    [0, 255], // 8-bit max (255)
    [255, 255], // 16-bit max (65535)
  ];

  for (const [byte0, byte1] of testCases) {
    const original: BkgdChunk = {
      length: 2,
      type: "bKGD",
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

Deno.test("bkgdChunkRefiner() - RGB background with extreme values", () => {
  const refiner = bkgdChunkRefiner();
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
    const original: BkgdChunk = {
      length: 6,
      type: "bKGD",
      data: { values },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, values);
  }
});

Deno.test("bkgdChunkRefiner() - indexed with all valid palette indices", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testIndices = [0, 127, 255];

  for (const index of testIndices) {
    const original: BkgdChunk = {
      length: 1,
      type: "bKGD",
      data: { values: [index] },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, [index]);
  }
});

Deno.test("bkgdChunkRefiner() - preserves exact byte values", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test with specific byte patterns
  const testPatterns: number[][] = [
    [0, 1], // Near minimum
    [254, 255], // Near maximum
    [127, 128], // Mid-range
    [128, 0], // Common gray value (32768)
    [171, 132], // Random value
  ];

  for (const values of testPatterns) {
    const original: BkgdChunk = {
      length: values.length,
      type: "bKGD",
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

Deno.test("bkgdChunkRefiner() - grayscale with common values", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCases: { name: string; values: [number, number]; value: number }[] =
    [
      { name: "Black", values: [0, 0], value: 0 },
      { name: "Mid-gray", values: [128, 0], value: 32768 },
      { name: "White", values: [255, 255], value: 65535 },
    ];

  for (const { values, value } of testCases) {
    const original: BkgdChunk = {
      length: 2,
      type: "bKGD",
      data: { values: [values[0], values[1]] },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, [values[0], values[1]]);
    // Verify big-endian encoding
    assertEquals((values[0] << 8) | values[1], value);
  }
});

Deno.test("bkgdChunkRefiner() - RGB with 16-bit depth values", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCases: number[][] = [
    [255, 255, 255, 255, 255, 255], // White (65535, 65535, 65535)
    [128, 0, 128, 0, 128, 0], // Mid-gray (32768, 32768, 32768)
    [0, 1, 0, 2, 0, 3], // Low values (1, 2, 3)
  ];

  for (const values of testCases) {
    const original: BkgdChunk = {
      length: 6,
      type: "bKGD",
      data: { values },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.values, values);
  }
});

Deno.test("bkgdChunkRefiner() - preserves various CRC values", () => {
  const refiner = bkgdChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCRCs = [0x00000000, 0xFFFFFFFF, 0x12345678, 0xAABBCCDD, 0x99887766];

  for (const crc of testCRCs) {
    const original: BkgdChunk = {
      length: 1,
      type: "bKGD",
      data: { values: [42] },
      crc: crc,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.crc, crc);
  }
});
