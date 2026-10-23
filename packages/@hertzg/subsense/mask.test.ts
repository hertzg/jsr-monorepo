import { test } from "node:test";
import { assertEquals, assertStrictEquals } from "@std/assert";
import {
  applyMajorityFilter,
  BACKGROUND,
  FOREGROUND,
  orMasks,
  xorMasks,
} from "./mask.ts";

test("applyMajorityFilter removes an isolated foreground pixel with a 3x3 kernel", () => {
  // deno-fmt-ignore
  const mask = {
    data: Uint8Array.from([
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 255, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ]),
    width: 5,
    height: 5,
  };
  const into = new Uint8Array(25);
  applyMajorityFilter(mask, { kernelSize: 3, into });
  assertEquals(into[12], BACKGROUND);
});

test("applyMajorityFilter keeps the centre of a solid 3x3 foreground block", () => {
  // deno-fmt-ignore
  const mask = {
    data: Uint8Array.from([
      0, 0,   0,   0, 0,
      0, 255, 255, 255, 0,
      0, 255, 255, 255, 0,
      0, 255, 255, 255, 0,
      0, 0,   0,   0, 0,
    ]),
    width: 5,
    height: 5,
  };
  const into = new Uint8Array(25);
  applyMajorityFilter(mask, { kernelSize: 3, into });
  assertEquals(into[12], FOREGROUND);
});

test("applyMajorityFilter fills a single background hole inside a solid block", () => {
  // deno-fmt-ignore
  const mask = {
    data: Uint8Array.from([
      255, 255, 255, 255, 255,
      255, 255, 255, 255, 255,
      255, 255, 0,   255, 255,
      255, 255, 255, 255, 255,
      255, 255, 255, 255, 255,
    ]),
    width: 5,
    height: 5,
  };
  const into = new Uint8Array(25);
  applyMajorityFilter(mask, { kernelSize: 3, into });
  assertEquals(into[12], FOREGROUND);
});

test("applyMajorityFilter with kernelSize 1 copies the mask", () => {
  // deno-fmt-ignore
  const mask = {
    data: Uint8Array.from([
      0, 255, 0,
      255, 0, 255,
      0, 255, 0,
    ]),
    width: 3,
    height: 3,
  };
  const into = new Uint8Array(9);
  applyMajorityFilter(mask, { kernelSize: 1, into });
  assertEquals(into, Uint8Array.from([0, 255, 0, 255, 0, 255, 0, 255, 0]));
});

test("applyMajorityFilter counts only in-bounds pixels at the corner", () => {
  // deno-fmt-ignore
  const mask = {
    data: Uint8Array.from([
      255, 255, 0, 0, 0,
      255, 255, 0, 0, 0,
      0,   0,   0, 0, 0,
      0,   0,   0, 0, 0,
      0,   0,   0, 0, 0,
    ]),
    width: 5,
    height: 5,
  };
  const into = new Uint8Array(25);
  applyMajorityFilter(mask, { kernelSize: 3, into });
  assertEquals(into[0], FOREGROUND);
});

test("applyMajorityFilter returns the into buffer", () => {
  const mask = {
    data: Uint8Array.from([255]),
    width: 1,
    height: 1,
  };
  const into = new Uint8Array(1);
  const result = applyMajorityFilter(mask, { kernelSize: 1, into });
  assertStrictEquals(result, into);
});

test("applyMajorityFilter leaves the source mask bytes unchanged", () => {
  // deno-fmt-ignore
  const mask = {
    data: Uint8Array.from([
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 255, 0, 0,
      0, 0, 0, 0, 0,
      0, 0, 0, 0, 0,
    ]),
    width: 5,
    height: 5,
  };
  applyMajorityFilter(mask, { kernelSize: 3, into: new Uint8Array(25) });
  // deno-fmt-ignore
  const expected = Uint8Array.from([
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 255, 0, 0,
    0, 0, 0, 0, 0,
    0, 0, 0, 0, 0,
  ]);
  assertEquals(mask.data, expected);
});

test("xorMasks sets a pixel only where exactly one input is set", () => {
  const a = Uint8Array.from([0, 255, 0, 255]);
  const b = Uint8Array.from([0, 0, 255, 255]);
  assertEquals(
    xorMasks(a, b, new Uint8Array(4)),
    Uint8Array.from([0, 255, 255, 0]),
  );
});

test("xorMasks writes the result into the into buffer", () => {
  const a = Uint8Array.from([255, 0]);
  const b = Uint8Array.from([0, 0]);
  const into = new Uint8Array(2);
  xorMasks(a, b, into);
  assertEquals(into, Uint8Array.from([255, 0]));
});

test("orMasks sets a pixel where either input is set", () => {
  const a = Uint8Array.from([255, 0, 0, 0]);
  const b = Uint8Array.from([0, 255, 0, 0]);
  assertEquals(
    orMasks(a, b, new Uint8Array(4)),
    Uint8Array.from([255, 255, 0, 0]),
  );
});

test("orMasks leaves a pixel clear when both inputs are clear", () => {
  const a = Uint8Array.from([0, 255]);
  const b = Uint8Array.from([0, 255]);
  assertEquals(orMasks(a, b, new Uint8Array(2))[0], BACKGROUND);
});
