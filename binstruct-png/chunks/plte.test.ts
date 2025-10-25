import { assertEquals } from "@std/assert";
import { createContext } from "@hertzg/binstruct";
import type { PngChunkUnknown } from "../mod.ts";
import { plteChunkRefiner, type PlteChunk } from "./plte.ts";

Deno.test("plteChunkRefiner() - refines PLTE chunk with single color", () => {
  const refiner = plteChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 3,
    type: new Uint8Array([80, 76, 84, 69]), // "PLTE"
    data: new Uint8Array([255, 0, 0]), // Red
    crc: 0x12345678,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "PLTE");
  assertEquals(refined.length, 3);
  assertEquals(refined.data.colors.length, 1);
  assertEquals(refined.data.colors[0], [255, 0, 0]);
  assertEquals(refined.crc, 0x12345678);
});

Deno.test("plteChunkRefiner() - refines PLTE chunk with multiple colors", () => {
  const refiner = plteChunkRefiner();
  const context = createContext("decode");

  const unknownChunk: PngChunkUnknown = {
    length: 9,
    type: new Uint8Array([80, 76, 84, 69]), // "PLTE"
    data: new Uint8Array([
      255, 0, 0, // Red
      0, 255, 0, // Green
      0, 0, 255, // Blue
    ]),
    crc: 0xAABBCCDD,
  };

  const refined = refiner.refine(unknownChunk, context);

  assertEquals(refined.type, "PLTE");
  assertEquals(refined.length, 9);
  assertEquals(refined.data.colors.length, 3);
  assertEquals(refined.data.colors[0], [255, 0, 0]);
  assertEquals(refined.data.colors[1], [0, 255, 0]);
  assertEquals(refined.data.colors[2], [0, 0, 255]);
});

Deno.test("plteChunkRefiner() - unrefines PLTE chunk", () => {
  const refiner = plteChunkRefiner();
  const context = createContext("encode");

  const refinedChunk: PlteChunk = {
    length: 6,
    type: "PLTE",
    data: {
      colors: [
        [255, 0, 0], // Red
        [0, 255, 0], // Green
      ],
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(refinedChunk, context);

  assertEquals(unrefined.type, new Uint8Array([80, 76, 84, 69])); // "PLTE"
  assertEquals(unrefined.length, 6);
  assertEquals(unrefined.data.length, 6);
  assertEquals(unrefined.data, new Uint8Array([255, 0, 0, 0, 255, 0]));
  assertEquals(unrefined.crc, 0x11223344);
});

Deno.test("plteChunkRefiner() - round-trip with single color", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PlteChunk = {
    length: 3,
    type: "PLTE",
    data: {
      colors: [[128, 128, 128]], // Gray
    },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.colors.length, original.data.colors.length);
  assertEquals(refined.data.colors[0], original.data.colors[0]);
  assertEquals(refined.crc, original.crc);
});

Deno.test("plteChunkRefiner() - round-trip with RGB palette", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PlteChunk = {
    length: 9,
    type: "PLTE",
    data: {
      colors: [
        [255, 0, 0], // Red
        [0, 255, 0], // Green
        [0, 0, 255], // Blue
      ],
    },
    crc: 0xAABBCCDD,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.type, original.type);
  assertEquals(refined.data.colors.length, 3);
  assertEquals(refined.data.colors[0], [255, 0, 0]);
  assertEquals(refined.data.colors[1], [0, 255, 0]);
  assertEquals(refined.data.colors[2], [0, 0, 255]);
});

Deno.test("plteChunkRefiner() - round-trip with grayscale palette", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PlteChunk = {
    length: 12,
    type: "PLTE",
    data: {
      colors: [
        [0, 0, 0], // Black
        [85, 85, 85], // Dark gray
        [170, 170, 170], // Light gray
        [255, 255, 255], // White
      ],
    },
    crc: 0xFFEEDDCC,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.colors.length, 4);
  assertEquals(refined.data.colors[0], [0, 0, 0]);
  assertEquals(refined.data.colors[1], [85, 85, 85]);
  assertEquals(refined.data.colors[2], [170, 170, 170]);
  assertEquals(refined.data.colors[3], [255, 255, 255]);
});

Deno.test("plteChunkRefiner() - round-trip with maximum palette size", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // PNG allows up to 256 colors in palette
  const colors: [number, number, number][] = [];
  for (let i = 0; i < 256; i++) {
    colors.push([i, 255 - i, i % 128]);
  }

  const original: PlteChunk = {
    length: 768, // 256 colors * 3 bytes
    type: "PLTE",
    data: { colors },
    crc: 0x99887766,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  assertEquals(refined.data.colors.length, 256);
  assertEquals(refined.data.colors[0], colors[0]);
  assertEquals(refined.data.colors[127], colors[127]);
  assertEquals(refined.data.colors[255], colors[255]);
});

Deno.test("plteChunkRefiner() - preserves color values exactly", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const testColors: [number, number, number][] = [
    [0, 0, 0],
    [255, 255, 255],
    [127, 127, 127],
    [1, 2, 3],
    [254, 253, 252],
    [128, 64, 32],
  ];

  const original: PlteChunk = {
    length: testColors.length * 3,
    type: "PLTE",
    data: { colors: testColors },
    crc: 0x12345678,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  for (let i = 0; i < testColors.length; i++) {
    assertEquals(refined.data.colors[i], testColors[i]);
  }
});

Deno.test("plteChunkRefiner() - handles partial palette entries", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  // Test with various palette sizes (not necessarily power of 2)
  const paletteSizes = [1, 2, 3, 5, 7, 13, 17, 64, 100, 200];

  for (const size of paletteSizes) {
    const colors: [number, number, number][] = [];
    for (let i = 0; i < size; i++) {
      colors.push([i % 256, (i * 2) % 256, (i * 3) % 256]);
    }

    const original: PlteChunk = {
      length: size * 3,
      type: "PLTE",
      data: { colors },
      crc: 0x12345678,
    };

    const unrefined = refiner.unrefine(original, encodeContext);
    const refined = refiner.refine(unrefined, decodeContext);

    assertEquals(refined.data.colors.length, size);
  }
});

Deno.test("plteChunkRefiner() - color components are independent", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PlteChunk = {
    length: 12,
    type: "PLTE",
    data: {
      colors: [
        [255, 0, 0], // Max red, min green/blue
        [0, 255, 0], // Max green, min red/blue
        [0, 0, 255], // Max blue, min red/green
        [255, 255, 0], // Max red/green, min blue
      ],
    },
    crc: 0x11223344,
  };

  const unrefined = refiner.unrefine(original, encodeContext);
  const refined = refiner.refine(unrefined, decodeContext);

  // Each color component should be preserved independently
  assertEquals(refined.data.colors[0], [255, 0, 0]);
  assertEquals(refined.data.colors[1], [0, 255, 0]);
  assertEquals(refined.data.colors[2], [0, 0, 255]);
  assertEquals(refined.data.colors[3], [255, 255, 0]);
});

Deno.test("plteChunkRefiner() - multiple round-trips are consistent", () => {
  const refiner = plteChunkRefiner();
  const encodeContext = createContext("encode");
  const decodeContext = createContext("decode");

  const original: PlteChunk = {
    length: 9,
    type: "PLTE",
    data: {
      colors: [
        [255, 0, 0],
        [0, 255, 0],
        [0, 0, 255],
      ],
    },
    crc: 0xAABBCCDD,
  };

  // Perform multiple round-trips
  let current = original;
  for (let i = 0; i < 3; i++) {
    const unrefined = refiner.unrefine(current, encodeContext);
    current = refiner.refine(unrefined, decodeContext);
  }

  assertEquals(current.type, original.type);
  assertEquals(current.data.colors.length, original.data.colors.length);
  assertEquals(current.data.colors[0], original.data.colors[0]);
  assertEquals(current.data.colors[1], original.data.colors[1]);
  assertEquals(current.data.colors[2], original.data.colors[2]);
});
