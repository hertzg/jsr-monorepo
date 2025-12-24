import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { type GamaChunk, gamaChunkRefiner } from "./gama.ts";

// A. Basic refine/unrefine tests

Deno.test("gamaChunkRefiner() - refines gAMA chunk with standard gamma (45455)", () => {
  const refiner = gamaChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 4,
    type: new Uint8Array([103, 65, 77, 65]), // "gAMA"
    // deno-fmt-ignore
    data: new Uint8Array([
      0x00, 0x00, 0xB1, 0x8F  // 45455 (gamma 1/2.2)
    ]),
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "gAMA");
  assertEquals(refined.length, 4);
  assertEquals(refined.data.gamma, 45455);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("gamaChunkRefiner() - refines gAMA chunk with linear gamma (100000)", () => {
  const refiner = gamaChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 4,
    type: new Uint8Array([103, 65, 77, 65]), // "gAMA"
    // deno-fmt-ignore
    data: new Uint8Array([
      0x00, 0x01, 0x86, 0xA0  // 100000 (gamma 1.0)
    ]),
    crc: 0xAABBCCDD,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "gAMA");
  assertEquals(refined.length, 4);
  assertEquals(refined.data.gamma, 100000);
  assertEquals(refined.crc, 0xAABBCCDD);
});

Deno.test("gamaChunkRefiner() - unrefines gAMA chunk", () => {
  const refiner = gamaChunkRefiner();
  const context = createContext("encode");

  const gamaChunk: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 46875, // gamma 1/2.14
    },
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(gamaChunk, context);

  assertEquals(unrefined.type, new Uint8Array([103, 65, 77, 65])); // "gAMA"
  assertEquals(unrefined.length, 4);
  assertEquals(unrefined.data.length, 4);
  // deno-fmt-ignore
  assertEquals(unrefined.data, new Uint8Array([
    0x00, 0x00, 0xB7, 0x1B  // 46875 as u32be
  ]));
  assertEquals(unrefined.crc, 0x99887766);
});

// B. Round-trip tests

Deno.test("gamaChunkRefiner() - round-trip with gamma 1/2.2 (45455)", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 45455,
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.gamma, original.data.gamma);
  assertEquals(refined.crc, original.crc);
});

Deno.test("gamaChunkRefiner() - round-trip with linear gamma (100000)", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 100000,
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.gamma, original.data.gamma);
  assertEquals(refined.crc, original.crc);
});

Deno.test("gamaChunkRefiner() - round-trip with custom gamma value", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 220000, // gamma 2.2
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.gamma, original.data.gamma);
  assertEquals(refined.crc, original.crc);
});

Deno.test("gamaChunkRefiner() - multiple round-trips consistency", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 50000,
    },
    crc: 0xDDEEFF00,
  };

  // Perform 3 round-trips
  let current = original;
  for (let i = 0; i < 3; i++) {
    const unrefined = refiner.unrefine(current, encodeContext);
    current = refiner.refine(unrefined, decodeContext);
  }

  assertEquals(current.type, original.type);
  assertEquals(current.data.gamma, original.data.gamma);
  assertEquals(current.crc, original.crc);
});

// C. Edge cases

Deno.test("gamaChunkRefiner() - minimum gamma value (1)", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 1,
    },
    crc: 0x00000000,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.gamma, 1);
  // deno-fmt-ignore
  assertEquals(unrefined.data, new Uint8Array([
    0x00, 0x00, 0x00, 0x01
  ]));
});

Deno.test("gamaChunkRefiner() - maximum gamma value (0xFFFFFFFF)", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: GamaChunk = {
    length: 4,
    type: "gAMA",
    data: {
      gamma: 0xFFFFFFFF,
    },
    crc: 0xFFFFFFFF,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.gamma, 0xFFFFFFFF);
  // deno-fmt-ignore
  assertEquals(unrefined.data, new Uint8Array([
    0xFF, 0xFF, 0xFF, 0xFF
  ]));
});

Deno.test("gamaChunkRefiner() - common gamma values round-trip", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const commonValues = [
    45455, // 1/2.2 standard CRT
    46875, // 1/2.14 variant CRT
    100000, // 1.0 linear
  ];

  for (const gammaValue of commonValues) {
    const original: GamaChunk = {
      length: 4,
      type: "gAMA",
      data: { gamma: gammaValue },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.gamma, gammaValue);
  }
});

Deno.test("gamaChunkRefiner() - CRC preservation through round-trip", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCRCs = [0x00000000, 0xFFFFFFFF, 0x12345678, 0xAABBCCDD, 0x99887766];

  for (const crc of testCRCs) {
    const original: GamaChunk = {
      length: 4,
      type: "gAMA",
      data: { gamma: 45455 },
      crc: crc,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.crc, crc);
  }
});

Deno.test("gamaChunkRefiner() - exact byte value preservation", () => {
  const refiner = gamaChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testCases: [number, number[]][] = [
    [1, [0x00, 0x00, 0x00, 0x01]],
    [256, [0x00, 0x00, 0x01, 0x00]],
    [65536, [0x00, 0x01, 0x00, 0x00]],
    [16777216, [0x01, 0x00, 0x00, 0x00]],
    [45455, [0x00, 0x00, 0xB1, 0x8F]],
    [46875, [0x00, 0x00, 0xB7, 0x1B]],
    [100000, [0x00, 0x01, 0x86, 0xA0]],
  ];

  for (const [gammaValue, expectedBytes] of testCases) {
    const original: GamaChunk = {
      length: 4,
      type: "gAMA",
      data: { gamma: gammaValue },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.gamma, gammaValue);
    assertEquals(
      Array.from(unrefined.data),
      expectedBytes,
    );
  }
});
