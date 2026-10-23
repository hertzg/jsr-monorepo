import { test } from "node:test";
import { assert, assertEquals, assertGreater, assertLess } from "@std/assert";
import { createSubsense } from "./subsense.ts";

/** Seeded xorshift32 fixture: deterministic uniform [0, 1) numbers. */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 2 ** 32;
  };
}

interface SquareOptions {
  /** Left column of the bright square. */
  left: number;
  /** Top row of the bright square. */
  top: number;
}

const SQUARE_SIZE_PIXELS = 8;
const SQUARE_BRIGHTNESS_LEVELS = 120;

/** Gradient background with +-3 levels of deterministic noise, optional bright square. */
function createGrayFrame(
  options: {
    width: number;
    height: number;
    noise: () => number;
    square?: SquareOptions;
  },
): Uint8Array {
  const { width, height, noise, square } = options;
  const frame = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let intensity = 40 + x + y + Math.floor(noise() * 7) - 3;
      if (
        square !== undefined &&
        x >= square.left && x < square.left + SQUARE_SIZE_PIXELS &&
        y >= square.top && y < square.top + SQUARE_SIZE_PIXELS
      ) {
        intensity += SQUARE_BRIGHTNESS_LEVELS;
      }
      frame[y * width + x] = intensity;
    }
  }
  return frame;
}

function countForeground(mask: Uint8Array): number {
  return mask.filter((value) => value === 255).length;
}

function countSquareForeground(
  options: { mask: Uint8Array; width: number; square: SquareOptions },
): number {
  const { mask, width, square } = options;
  let count = 0;
  for (let y = square.top; y < square.top + SQUARE_SIZE_PIXELS; y++) {
    for (let x = square.left; x < square.left + SQUARE_SIZE_PIXELS; x++) {
      if (mask[y * width + x] === 255) count++;
    }
  }
  return count;
}

/** Foreground pixels farther than one pixel from the square. */
function countForegroundOutsideSquare(
  options: { mask: Uint8Array; width: number; square: SquareOptions },
): number {
  const { mask, width, square } = options;
  let count = 0;
  for (let index = 0; index < mask.length; index++) {
    const x = index % width;
    const y = (index - x) / width;
    const isNearSquare = x >= square.left - 1 &&
      x < square.left + SQUARE_SIZE_PIXELS + 1 &&
      y >= square.top - 1 && y < square.top + SQUARE_SIZE_PIXELS + 1;
    if (!isNearSquare && mask[index] === 255) count++;
  }
  return count;
}

test("first frame counts as one segmented frame", () => {
  const width = 16;
  const height = 16;
  const detector = createSubsense({
    width,
    height,
    random: createSeededRandom(1),
  });

  detector.segment(
    createGrayFrame({ width, height, noise: createSeededRandom(1000) }),
  );

  assertEquals(detector.frameCount, 1);
});

test("first frame returns a mask of width * height bytes", () => {
  const width = 16;
  const height = 12;
  const detector = createSubsense({
    width,
    height,
    random: createSeededRandom(1),
  });

  const mask = detector.segment(
    createGrayFrame({ width, height, noise: createSeededRandom(1000) }),
  );

  assertEquals(mask.length, width * height);
});

test("segment returns a fresh array each call", () => {
  const width = 16;
  const height = 16;
  const detector = createSubsense({
    width,
    height,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);

  const first = detector.segment(createGrayFrame({ width, height, noise }));
  const firstCopy = first.slice();
  const second = detector.segment(createGrayFrame({ width, height, noise }));

  assert(first !== second);
  assertEquals(first, firstCopy);
});

// Measured: 0 foreground pixels in each of 30 frames for seeds 1, 7 and 99.
test("static noisy background has no foreground pixels after 30 frames", () => {
  const width = 32;
  const height = 32;
  const detector = createSubsense({
    width,
    height,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);

  let mask: Uint8Array = new Uint8Array();
  for (let frame = 0; frame < 30; frame++) {
    mask = detector.segment(createGrayFrame({ width, height, noise }));
  }

  assertEquals(countForeground(mask), 0);
});

// Measured with kernel 3 on seeds 1, 7 and 99: 63-64 of 64 square pixels
// foreground and 0 foreground pixels outside the dilated square, in each of
// the first 3 frames after the square appears. A 9x9 kernel erodes an 8x8
// square to 52-58 pixels, so this test uses 3.
test("bright square appearing after warm-up is detected without false positives with a 3x3 median kernel", () => {
  const width = 32;
  const height = 32;
  const square = { left: 12, top: 12 };
  const detector = createSubsense({
    width,
    height,
    medianKernelSize: 3,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);
  for (let frame = 0; frame < 30; frame++) {
    detector.segment(createGrayFrame({ width, height, noise }));
  }

  const mask = detector.segment(
    createGrayFrame({ width, height, noise, square }),
  );

  const squareArea = SQUARE_SIZE_PIXELS * SQUARE_SIZE_PIXELS;
  const outsideArea = width * height - 10 * 10;
  assertGreater(
    countSquareForeground({ mask, width, square }) / squareArea,
    0.9,
  );
  assertLess(
    countForegroundOutsideSquare({ mask, width, square }) / outsideArea,
    0.02,
  );
});

// Measured with kernel 3 on seeds 1, 7 and 99: 62-64 of 64 pixels foreground
// in every one of the 20 steps while the square stays inside the frame.
test("square moving 2 pixels per frame keeps being detected with a 3x3 median kernel", () => {
  const width = 64;
  const height = 24;
  const detector = createSubsense({
    width,
    height,
    medianKernelSize: 3,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);
  for (let frame = 0; frame < 30; frame++) {
    detector.segment(createGrayFrame({ width, height, noise }));
  }

  const detectedPixelCounts: number[] = [];
  for (let step = 0; step < 20; step++) {
    const square = { left: 2 + step * 2, top: 8 };
    const mask = detector.segment(
      createGrayFrame({ width, height, noise, square }),
    );
    detectedPixelCounts.push(countSquareForeground({ mask, width, square }));
  }

  const squareArea = SQUARE_SIZE_PIXELS * SQUARE_SIZE_PIXELS;
  for (const detectedPixelCount of detectedPixelCounts) {
    assertGreater(detectedPixelCount / squareArea, 0.75);
  }
});

// Measured: a stopped square is absorbed after 61-63 frames (seeds 1, 2, 3, 7,
// 99, 12345; this test asserts 150) with colorDistanceThreshold 60 (R grows past the square's
// contrast). With the default threshold of 30 absorption takes hundreds of
// frames or never happens, because R cannot grow past 9.
test("stopped square is absorbed when colour threshold is 60 and warm-up is 30 frames with a 3x3 median kernel (v still high)", () => {
  const width = 24;
  const height = 24;
  const square = { left: 8, top: 8 };
  const detector = createSubsense({
    width,
    height,
    medianKernelSize: 3,
    colorDistanceThreshold: 60,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);
  for (let frame = 0; frame < 30; frame++) {
    detector.segment(createGrayFrame({ width, height, noise }));
  }

  let mask: Uint8Array = new Uint8Array();
  for (let frame = 0; frame < 150; frame++) {
    mask = detector.segment(createGrayFrame({ width, height, noise, square }));
  }

  const squareArea = SQUARE_SIZE_PIXELS * SQUARE_SIZE_PIXELS;
  assertLess(countSquareForeground({ mask, width, square }) / squareArea, 0.1);
});

// With the default threshold R cannot grow past the square's contrast, so a
// square held still stays foreground even after a long static warm-up.
test("stopped square stays foreground with default threshold after a 300 frame warm-up with a 3x3 median kernel", () => {
  const width = 24;
  const height = 24;
  const square = { left: 8, top: 8 };
  const detector = createSubsense({
    width,
    height,
    medianKernelSize: 3,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);
  for (let frame = 0; frame < 300; frame++) {
    detector.segment(createGrayFrame({ width, height, noise }));
  }

  let mask: Uint8Array = new Uint8Array();
  for (let frame = 0; frame < 600; frame++) {
    mask = detector.segment(createGrayFrame({ width, height, noise, square }));
  }

  const squareArea = SQUARE_SIZE_PIXELS * SQUARE_SIZE_PIXELS;
  assertGreater(
    countSquareForeground({ mask, width, square }) / squareArea,
    0.9,
  );
});

// Measured with seed 1: mean T inside the square is ~4.4 after 6 frames,
// outside it stays at the lower cap 2.
test("mean learning rate is higher inside foreground than outside", () => {
  const width = 24;
  const height = 24;
  const square = { left: 8, top: 8 };
  const detector = createSubsense({
    width,
    height,
    random: createSeededRandom(1),
  });
  const noise = createSeededRandom(1000);
  for (let frame = 0; frame < 30; frame++) {
    detector.segment(createGrayFrame({ width, height, noise }));
  }
  for (let frame = 0; frame < 6; frame++) {
    detector.segment(createGrayFrame({ width, height, noise, square }));
  }

  let insideSum = 0;
  let outsideSum = 0;
  for (let index = 0; index < width * height; index++) {
    const x = index % width;
    const y = (index - x) / width;
    const isInside = x >= square.left && x < square.left + SQUARE_SIZE_PIXELS &&
      y >= square.top && y < square.top + SQUARE_SIZE_PIXELS;
    if (isInside) insideSum += detector.learningRates[index];
    else outsideSum += detector.learningRates[index];
  }
  const insideMean = insideSum / (SQUARE_SIZE_PIXELS * SQUARE_SIZE_PIXELS);
  const outsideMean = outsideSum /
    (width * height - SQUARE_SIZE_PIXELS * SQUARE_SIZE_PIXELS);

  assertGreater(insideMean, outsideMean);
});

test("RGB input gives the same mask as the equivalent gray input", () => {
  const width = 16;
  const height = 16;
  const square = { left: 4, top: 4 };
  const grayDetector = createSubsense({
    width,
    height,
    channels: 1,
    random: createSeededRandom(1),
  });
  const rgbDetector = createSubsense({
    width,
    height,
    channels: 3,
    random: createSeededRandom(1),
  });
  const grayNoise = createSeededRandom(1000);
  const rgbNoise = createSeededRandom(1000);

  let grayMask: Uint8Array = new Uint8Array();
  let rgbMask: Uint8Array = new Uint8Array();
  for (let frame = 0; frame < 12; frame++) {
    const withSquare = frame >= 8 ? square : undefined;
    const grayFrame = createGrayFrame({
      width,
      height,
      noise: grayNoise,
      square: withSquare,
    });
    const rgbFrame = new Uint8Array(width * height * 3);
    createGrayFrame({
      width,
      height,
      noise: rgbNoise,
      square: withSquare,
    }).forEach(
      (intensity, index) => rgbFrame.fill(intensity, index * 3, index * 3 + 3),
    );
    grayMask = grayDetector.segment(grayFrame);
    rgbMask = rgbDetector.segment(rgbFrame);
  }

  assertEquals(rgbMask, grayMask);
});

test("median kernel 1 keeps an isolated foreground pixel and 9 removes it", () => {
  const width = 16;
  const height = 16;
  const background = new Uint8Array(width * height).fill(40);
  const withSpeck = background.slice();
  withSpeck[8 * width + 8] = 200;
  const unfiltered = createSubsense({
    width,
    height,
    medianKernelSize: 1,
    random: createSeededRandom(1),
  });
  const filtered = createSubsense({
    width,
    height,
    medianKernelSize: 9,
    random: createSeededRandom(1),
  });
  for (let frame = 0; frame < 5; frame++) {
    unfiltered.segment(background);
    filtered.segment(background);
  }

  const unfilteredMask = unfiltered.segment(withSpeck);
  const filteredMask = filtered.segment(withSpeck);

  assertEquals(unfilteredMask[8 * width + 8], 255);
  assertEquals(countForeground(filteredMask), 0);
});
