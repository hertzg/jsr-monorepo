import { test } from "node:test";
import { assertEquals } from "@std/assert";
import {
  computeHammingDistance16,
  computeLbsp,
  createLbspThresholdTable,
  LBSP_BIT_COUNT,
} from "./lbsp.ts";

/**
 * Builds a 5x5 patch filled with `background`, with one pixel at offset
 * (dx, dy) from the centre (index 12) set to `value`.
 */
function patchWithNeighbour(
  options: { background: number; value: number; dx: number; dy: number },
): Uint8Array {
  const { background, value, dx, dy } = options;
  const data = new Uint8Array(25).fill(background);
  data[(2 + dy) * 5 + (2 + dx)] = value;
  return data;
}

test("LBSP_BIT_COUNT is 16", () => {
  assertEquals(LBSP_BIT_COUNT, 16);
});

test("uniform patch gives descriptor 0", () => {
  const image = { data: new Uint8Array(25).fill(100), width: 5, height: 5 };
  assertEquals(computeLbsp(image, 12, { intensity: 100, threshold: 0 }), 0);
});

// One bright neighbour at each offset sets exactly that offset's bit.
const neighbourRows = [
  ["bit 15 for (-1, 1)", -1, 1, 15],
  ["bit 14 for (1, -1)", 1, -1, 14],
  ["bit 13 for (1, 1)", 1, 1, 13],
  ["bit 12 for (-1, -1)", -1, -1, 12],
  ["bit 11 for (1, 0)", 1, 0, 11],
  ["bit 10 for (0, -1)", 0, -1, 10],
  ["bit 9 for (-1, 0)", -1, 0, 9],
  ["bit 8 for (0, 1)", 0, 1, 8],
  ["bit 7 for (-2, -2)", -2, -2, 7],
  ["bit 6 for (2, 2)", 2, 2, 6],
  ["bit 5 for (2, -2)", 2, -2, 5],
  ["bit 4 for (-2, 2)", -2, 2, 4],
  ["bit 3 for (0, 2)", 0, 2, 3],
  ["bit 2 for (0, -2)", 0, -2, 2],
  ["bit 1 for (2, 0)", 2, 0, 1],
  ["bit 0 for (-2, 0)", -2, 0, 0],
] as const;

for (const [name, dx, dy, bit] of neighbourRows) {
  test(`single bright neighbour sets ${name}`, () => {
    const image = {
      data: patchWithNeighbour({ background: 100, value: 200, dx, dy }),
      width: 5,
      height: 5,
    };
    assertEquals(
      computeLbsp(image, 12, { intensity: 100, threshold: 10 }),
      1 << bit,
    );
  });
}

test("difference equal to the threshold does not set the bit", () => {
  const image = {
    data: patchWithNeighbour({ background: 100, value: 110, dx: 1, dy: 0 }),
    width: 5,
    height: 5,
  };
  assertEquals(computeLbsp(image, 12, { intensity: 100, threshold: 10 }), 0);
});

test("difference one above the threshold sets the bit", () => {
  const image = {
    data: patchWithNeighbour({ background: 100, value: 111, dx: 1, dy: 0 }),
    width: 5,
    height: 5,
  };
  assertEquals(
    computeLbsp(image, 12, { intensity: 100, threshold: 10 }),
    1 << 11,
  );
});

test("corner pixel reads clamped neighbours at the border", () => {
  // Column 0 is 200, the rest is 50. Pixel 0 is at x=0, so every offset with
  // dx <= 0 clamps into column 0 and reads 200. Offsets with dx > 0 read 50.
  // Expected bits: 15, 12, 10, 9, 8, 7, 4, 3, 2, 0 = 0b1001_0111_1001_1101.
  const data = new Uint8Array(9).fill(50);
  data[0] = 200;
  data[3] = 200;
  data[6] = 200;
  const image = { data, width: 3, height: 3 };
  assertEquals(computeLbsp(image, 0, { intensity: 50, threshold: 10 }), 0x979d);
});

test("hamming distance between 0xffff and 0 is 16", () => {
  assertEquals(computeHammingDistance16(0xffff, 0), 16);
});

test("hamming distance between equal descriptors is 0", () => {
  assertEquals(computeHammingDistance16(0x1234, 0x1234), 0);
});

test("hamming distance of one differing low bit is 1", () => {
  assertEquals(computeHammingDistance16(0b1, 0), 1);
});

test("hamming distance of 0x0f0f and 0 is 8", () => {
  assertEquals(computeHammingDistance16(0x0f0f, 0), 8);
});

test("hamming distance of 0xffff and 0xfffe is 1", () => {
  assertEquals(computeHammingDistance16(0xffff, 0xfffe), 1);
});

test("threshold table is 256 entries long", () => {
  const lut = createLbspThresholdTable({ relativeThreshold: 0.333 });
  assertEquals(lut.length, 256);
});

test("threshold table at intensity 0 is 0", () => {
  const lut = createLbspThresholdTable({ relativeThreshold: 0.333 });
  assertEquals(lut[0], 0);
});

test("threshold table at intensity 100 is 11", () => {
  // 100 * 0.333 = 33.3, / 3 = 11.1, floor = 11
  const lut = createLbspThresholdTable({ relativeThreshold: 0.333 });
  assertEquals(lut[100], 11);
});

test("threshold table at intensity 255 is 28", () => {
  // 255 * 0.333 = 84.915, / 3 = 28.305, floor = 28
  const lut = createLbspThresholdTable({ relativeThreshold: 0.333 });
  assertEquals(lut[255], 28);
});

test("threshold table caps entries at 255", () => {
  // 255 * 4 / 3 = 340, capped to 255
  const lut = createLbspThresholdTable({ relativeThreshold: 4 });
  assertEquals(lut[255], 255);
});

test("threshold table adds the offset before scaling", () => {
  // (30 + 0 * 0.333) / 3 = 10
  const lut = createLbspThresholdTable({
    relativeThreshold: 0.333,
    offset: 30,
  });
  assertEquals(lut[0], 10);
});
