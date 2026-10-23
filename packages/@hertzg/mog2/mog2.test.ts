import { test } from "node:test";
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  createMog2,
  MASK_BACKGROUND,
  MASK_FOREGROUND,
  MASK_SHADOW,
} from "@hertzg/mog2";

function makeFrame(
  width: number,
  height: number,
  value: number,
  channels = 1,
): Uint8Array {
  return new Uint8Array(width * height * channels).fill(value);
}

interface FillRectOptions {
  width: number;
  channels?: number;
  x: number;
  y: number;
  rectWidth: number;
  rectHeight: number;
  value: number;
}

function fillRect(frame: Uint8Array, options: FillRectOptions): void {
  const { width, channels = 1, x, y, rectWidth, rectHeight, value } = options;
  for (let row = y; row < y + rectHeight; row++) {
    for (let column = x; column < x + rectWidth; column++) {
      const start = (row * width + column) * channels;
      frame.fill(value, start, start + channels);
    }
  }
}

function countValue(mask: Uint8Array, value: number): number {
  let count = 0;
  for (const byte of mask) if (byte === value) count++;
  return count;
}

function makeBlockFrame(
  width: number,
  height: number,
  background: number,
  blockValue: number,
): Uint8Array {
  const frame = makeFrame(width, height, background);
  fillRect(frame, {
    width,
    x: 2,
    y: 2,
    rectWidth: 3,
    rectHeight: 3,
    value: blockValue,
  });
  return frame;
}

function makeBlockMask(width: number, height: number): Uint8Array {
  const mask = makeFrame(width, height, 0);
  fillRect(mask, {
    width,
    x: 2,
    y: 2,
    rectWidth: 3,
    rectHeight: 3,
    value: 255,
  });
  return mask;
}

// Tiny seeded LCG returning integers in [-amplitude, amplitude].
function makeNoiseSource(seed: number): (amplitude: number) => number {
  let state = seed;
  return (amplitude) => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state >>> 16) % (2 * amplitude + 1) - amplitude;
  };
}

test("first frame without shadow detection is all foreground", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, detectShadows: false });

  const mask = model.apply(makeFrame(width, height, 100));

  assertEquals(mask, makeFrame(width, height, MASK_FOREGROUND));
});

test("first frame with default shadow detection is all shadow", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });

  const mask = model.apply(makeFrame(width, height, 100));

  assertEquals(mask, makeFrame(width, height, MASK_SHADOW));
});

test("static scene is all background from the second frame on", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const frame = makeFrame(width, height, 100);
  model.apply(frame);

  const second = model.apply(frame);
  for (let i = 3; i < 50; i++) model.apply(frame);
  const fiftieth = model.apply(frame);

  assertEquals(second, makeFrame(width, height, MASK_BACKGROUND));
  assertEquals(fiftieth, makeFrame(width, height, MASK_BACKGROUND));
});

test("block jumping from 50 to 200 is foreground only on its 9 pixels", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const scene = makeFrame(width, height, 50);
  for (let i = 0; i < 20; i++) model.apply(scene);

  const mask = model.apply(makeBlockFrame(width, height, 50, 200));

  assertEquals(mask, makeBlockMask(width, height));
});

test("persistent block is foreground for 5 frames then absorbed within 500", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const scene = makeFrame(width, height, 50);
  // 250 frames puts the automatic learning rate at its floor of 1 / history.
  for (let i = 0; i < 250; i++) model.apply(scene);
  const blockFrame = makeBlockFrame(width, height, 50, 200);

  const firstFiveCounts: number[] = [];
  let absorbedAtFrame = -1;
  for (let frameIndex = 1; frameIndex <= 500; frameIndex++) {
    const mask = model.apply(blockFrame);
    if (frameIndex <= 5) firstFiveCounts.push(countValue(mask, 255));
    if (countValue(mask, 255) === 0) {
      absorbedAtFrame = frameIndex;
      break;
    }
  }

  assertEquals(firstFiveCounts, [9, 9, 9, 9, 9]);
  assert(absorbedAtFrame !== -1, "block was never absorbed within 500 frames");
  assert(absorbedAtFrame > 5, `absorbed too early: ${absorbedAtFrame}`);
});

test("learning rate 0 freezes the model so a persistent block stays foreground", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const scene = makeFrame(width, height, 50);
  for (let i = 0; i < 20; i++) model.apply(scene);
  const blockFrame = makeBlockFrame(width, height, 50, 200);

  let mask: Uint8Array = new Uint8Array(0);
  for (let i = 0; i < 300; i++) {
    mask = model.apply(blockFrame, { learningRate: 0 });
  }

  assertEquals(mask, makeBlockMask(width, height));
});

test("learning rate 0 never creates a mode even when the mixture is full", () => {
  const width = 4;
  const height = 4;
  const model = createMog2({
    width,
    height,
    mixtures: 2,
    detectShadows: false,
  });
  for (let i = 0; i < 40; i++) {
    model.apply(makeFrame(width, height, 50));
    model.apply(makeFrame(width, height, 150));
  }
  model.apply(makeFrame(width, height, 250), { learningRate: 0 });

  const knownMask = model.apply(makeFrame(width, height, 150), {
    learningRate: 0,
  });
  const unknownMask = model.apply(makeFrame(width, height, 250), {
    learningRate: 0,
  });

  assertEquals(knownMask, makeFrame(width, height, MASK_BACKGROUND));
  assertEquals(unknownMask, makeFrame(width, height, MASK_FOREGROUND));
});

test("learning rate 1 adopts the frame as background", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const scene = makeFrame(width, height, 50);
  for (let i = 0; i < 20; i++) model.apply(scene);
  const blockFrame = makeBlockFrame(width, height, 50, 200);
  model.apply(blockFrame, { learningRate: 1 });

  const next = model.apply(blockFrame);

  assertEquals(next, makeFrame(width, height, MASK_BACKGROUND));
});

test("learning rate 1 reinitialises the model", () => {
  const model = createMog2({ width: 2, height: 1 });
  for (let i = 0; i < 20; i++) model.apply(new Uint8Array([50, 50]));

  const reinitialised = model.apply(new Uint8Array([50, 200]), {
    learningRate: 1,
  });
  const frameCount = model.frameCount;
  const next = model.apply(new Uint8Array([50, 200]));

  assertEquals(reinitialised, new Uint8Array([MASK_SHADOW, MASK_SHADOW]));
  assertEquals(frameCount, 1);
  assertEquals(next, new Uint8Array([MASK_BACKGROUND, MASK_BACKGROUND]));
});

test("NaN learning rate falls back to the automatic rate", () => {
  const width = 2;
  const height = 1;
  const nanModel = createMog2({ width, height, detectShadows: false });
  const autoModel = createMog2({ width, height, detectShadows: false });
  for (let i = 0; i < 20; i++) {
    nanModel.apply(new Uint8Array([50, 50]));
    autoModel.apply(new Uint8Array([50, 50]));
  }
  nanModel.apply(new Uint8Array([50, 50]), { learningRate: NaN });
  autoModel.apply(new Uint8Array([50, 50]));

  const nanMasks: Uint8Array[] = [];
  const autoMasks: Uint8Array[] = [];
  for (let i = 0; i < 100; i++) {
    nanMasks.push(nanModel.apply(new Uint8Array([50, 200])));
    autoMasks.push(autoModel.apply(new Uint8Array([50, 200])));
  }

  assertEquals(nanMasks, autoMasks);
  assertEquals(nanModel.getBackgroundImage(), autoModel.getBackgroundImage());
});

test("first frame ignores the caller's learning rate", () => {
  const width = 4;
  const height = 4;
  const model = createMog2({ width, height });
  const frame = makeFrame(width, height, 80);
  model.apply(frame, { learningRate: 0 });

  const second = model.apply(frame);

  assertEquals(second, makeFrame(width, height, MASK_BACKGROUND));
});

test("a darker pixel within the shadow range is shadow", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  for (let i = 0; i < 20; i++) model.apply(makeFrame(width, height, 200));

  const mask = model.apply(makeFrame(width, height, 120));

  assertEquals(mask, makeFrame(width, height, MASK_SHADOW));
});

test("a pixel much darker than the shadow range is foreground", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  for (let i = 0; i < 20; i++) model.apply(makeFrame(width, height, 200));

  const mask = model.apply(makeFrame(width, height, 40));

  assertEquals(mask, makeFrame(width, height, MASK_FOREGROUND));
});

test("a darker pixel is foreground when shadow detection is off", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, detectShadows: false });
  for (let i = 0; i < 20; i++) model.apply(makeFrame(width, height, 200));

  const mask = model.apply(makeFrame(width, height, 120));

  assertEquals(mask, makeFrame(width, height, MASK_FOREGROUND));
});

test("small deterministic noise on a warmed-up scene stays background", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  for (let i = 0; i < 30; i++) model.apply(makeFrame(width, height, 100));
  const nextNoise = makeNoiseSource(12345);

  let nonBackgroundPixels = 0;
  for (let i = 0; i < 20; i++) {
    const frame = makeFrame(width, height, 100);
    for (let p = 0; p < frame.length; p++) frame[p] += nextNoise(2);
    const mask = model.apply(frame);
    nonBackgroundPixels += mask.length - countValue(mask, MASK_BACKGROUND);
  }

  assertEquals(nonBackgroundPixels, 0);
});

test("background image of a warmed-up model is within 1 of the scene", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const scene = new Uint8Array(width * height);
  for (let i = 0; i < scene.length; i++) scene[i] = 20 + i * 3;
  for (let i = 0; i < 30; i++) model.apply(scene);

  const background = model.getBackgroundImage();

  let maxDifference = 0;
  for (let i = 0; i < scene.length; i++) {
    maxDifference = Math.max(maxDifference, Math.abs(background[i] - scene[i]));
  }
  assert(maxDifference <= 1, `max difference was ${maxDifference}`);
});

test("background image of a 4-channel model has alpha 255", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, channels: 4 });
  const scene = makeFrame(width, height, 90, 4);
  for (let i = 0; i < 30; i++) model.apply(scene);

  const background = model.getBackgroundImage();

  const alphaBytes = background.filter((_, index) => index % 4 === 3);
  assertEquals(alphaBytes, makeFrame(width, height, 255));
});

test("background image of a fresh 4-channel model is zeros with alpha 255", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, channels: 4 });
  const expected = new Uint8Array(width * height * 4);
  for (let i = 3; i < expected.length; i += 4) expected[i] = 255;

  const background = model.getBackgroundImage();

  assertEquals(background, expected);
});

test("background image is written into the provided buffer", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const buffer = new Uint8Array(width * height);

  const background = model.getBackgroundImage(buffer);

  assertStrictEquals(background, buffer);
});

test("background image is written into a provided Uint8ClampedArray", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const buffer = new Uint8ClampedArray(width * height);

  const background = model.getBackgroundImage(buffer);

  assertStrictEquals(background, buffer);
});

test("3-channel change on one colour channel is foreground", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, channels: 3 });
  const scene = makeFrame(width, height, 50, 3);
  for (let i = 0; i < 20; i++) model.apply(scene);
  const changed = scene.slice();
  const changedPixel = 10;
  changed[changedPixel * 3 + 1] = 200;
  const expected = makeFrame(width, height, MASK_BACKGROUND);
  expected[changedPixel] = MASK_FOREGROUND;

  const mask = model.apply(changed);

  assertEquals(mask, expected);
});

test("4-channel alpha-only changes keep the mask all background", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, channels: 4 });
  const scene = makeFrame(width, height, 80, 4);
  for (let i = 3; i < scene.length; i += 4) scene[i] = 255;
  for (let i = 0; i < 20; i++) model.apply(scene);
  const alphaChanged = scene.slice();
  for (let i = 3; i < alphaChanged.length; i += 4) alphaChanged[i] = 0;

  const mask = model.apply(alphaChanged);

  assertEquals(mask, makeFrame(width, height, MASK_BACKGROUND));
});

test("apply returns the same buffer that was passed as into", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const into = new Uint8Array(width * height);

  const mask = model.apply(makeFrame(width, height, 100), { into });

  assertStrictEquals(mask, into);
});

test("apply writes the mask into the provided buffer", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, detectShadows: false });
  const into = new Uint8Array(width * height);

  model.apply(makeFrame(width, height, 100), { into });

  assertEquals(into, makeFrame(width, height, MASK_FOREGROUND));
});

test("frameCount increments with every applied frame", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  const frame = makeFrame(width, height, 100);

  model.apply(frame);
  model.apply(frame);
  model.apply(frame);

  assertEquals(model.frameCount, 3);
});

test("reset zeroes frameCount", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });
  model.apply(makeFrame(width, height, 100));
  model.apply(makeFrame(width, height, 100));

  model.reset();

  assertEquals(model.frameCount, 0);
});

test("after reset the next frame behaves like the first frame", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height, detectShadows: false });
  const frame = makeFrame(width, height, 100);
  for (let i = 0; i < 10; i++) model.apply(frame);
  model.reset();

  const mask = model.apply(frame);

  assertEquals(mask, makeFrame(width, height, MASK_FOREGROUND));
});

test("createMog2 throws RangeError for zero width", () => {
  assertThrows(() => createMog2({ width: 0, height: 8 }), RangeError);
});

test("createMog2 throws RangeError for non-integer height", () => {
  assertThrows(() => createMog2({ width: 8, height: 2.5 }), RangeError);
});

test("createMog2 throws RangeError for 2 channels", () => {
  assertThrows(
    () =>
      createMog2({
        width: 8,
        height: 8,
        // @ts-expect-error 2 is not a supported channel count
        channels: 2,
      }),
    RangeError,
  );
});

test("apply throws RangeError for a frame of the wrong length", () => {
  const width = 8;
  const height = 8;
  const model = createMog2({ width, height });

  assertThrows(
    () => model.apply(new Uint8Array(width * height - 1)),
    RangeError,
  );
});
