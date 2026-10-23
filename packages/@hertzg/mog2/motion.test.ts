import { test } from "node:test";
import { assertEquals } from "@std/assert";
import {
  detectMotion,
  MASK_BACKGROUND,
  MASK_FOREGROUND,
  MASK_SHADOW,
} from "@hertzg/mog2";

test("empty mask reports no motion", () => {
  const width = 4;
  const height = 3;
  const mask = new Uint8Array(width * height).fill(MASK_BACKGROUND);

  assertEquals(detectMotion(mask, { width, height }), {
    detected: false,
    foregroundPixels: 0,
    foregroundRatio: 0,
    bounds: undefined,
  });
});

test("single foreground pixel gives a 1x1 box at its position", () => {
  const width = 5;
  const height = 4;
  const mask = new Uint8Array(width * height);
  mask[2 * width + 3] = MASK_FOREGROUND;

  assertEquals(
    detectMotion(mask, { width, height, minForegroundRatio: 0.05 }),
    {
      detected: true,
      foregroundPixels: 1,
      foregroundRatio: 1 / 20,
      bounds: { x: 3, y: 2, width: 1, height: 1 },
    },
  );
});

test("L-shaped region is bounded by its extremes", () => {
  const width = 6;
  const height = 6;
  const mask = new Uint8Array(width * height);
  for (const [x, y] of [[1, 1], [1, 2], [1, 3], [2, 3], [3, 3]]) {
    mask[y * width + x] = MASK_FOREGROUND;
  }

  assertEquals(detectMotion(mask, { width, height }).bounds, {
    x: 1,
    y: 1,
    width: 3,
    height: 3,
  });
});

test("shadows are ignored by default", () => {
  const width = 4;
  const height = 4;
  const mask = new Uint8Array(width * height).fill(MASK_SHADOW);

  assertEquals(detectMotion(mask, { width, height }), {
    detected: false,
    foregroundPixels: 0,
    foregroundRatio: 0,
    bounds: undefined,
  });
});

test("shadows are counted with includeShadows", () => {
  const width = 4;
  const height = 4;
  const mask = new Uint8Array(width * height);
  mask[1 * width + 1] = MASK_SHADOW;
  mask[2 * width + 2] = MASK_FOREGROUND;

  assertEquals(detectMotion(mask, { width, height, includeShadows: true }), {
    detected: true,
    foregroundPixels: 2,
    foregroundRatio: 2 / 16,
    bounds: { x: 1, y: 1, width: 2, height: 2 },
  });
});

test("ratio equal to the threshold is detected", () => {
  const width = 4;
  const height = 4;
  const mask = new Uint8Array(width * height);
  mask[0] = MASK_FOREGROUND;
  mask[1] = MASK_FOREGROUND;

  assertEquals(
    detectMotion(mask, { width, height, minForegroundRatio: 2 / 16 }).detected,
    true,
  );
});

test("ratio just below the threshold is not detected", () => {
  const width = 4;
  const height = 4;
  const mask = new Uint8Array(width * height);
  mask[0] = MASK_FOREGROUND;

  assertEquals(
    detectMotion(mask, { width, height, minForegroundRatio: 2 / 16 }).detected,
    false,
  );
});

test("foreground spanning two rows gives bounds across rows", () => {
  const width = 5;
  const height = 5;
  const mask = new Uint8Array(width * height);
  mask[1 * width + 4] = MASK_FOREGROUND;
  mask[2 * width + 0] = MASK_FOREGROUND;

  assertEquals(detectMotion(mask, { width, height }).bounds, {
    x: 0,
    y: 1,
    width: 5,
    height: 2,
  });
});
