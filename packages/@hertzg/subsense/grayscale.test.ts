import { test } from "node:test";
import { assertEquals, assertStrictEquals } from "@std/assert";
import { convertToGrayscale } from "./grayscale.ts";

test("convertToGrayscale maps pure red to its BT.601 luma", () => {
  const into = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([255, 0, 0]), { channels: 3, into });
  assertEquals(into[0], 77);
});

test("convertToGrayscale maps pure green to its BT.601 luma", () => {
  const into = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([0, 255, 0]), { channels: 3, into });
  assertEquals(into[0], 149);
});

test("convertToGrayscale maps pure blue to its BT.601 luma", () => {
  const into = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([0, 0, 255]), { channels: 3, into });
  assertEquals(into[0], 29);
});

test("convertToGrayscale maps white to 255", () => {
  const into = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([255, 255, 255]), { channels: 3, into });
  assertEquals(into[0], 255);
});

test("convertToGrayscale maps black to 0", () => {
  const into = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([0, 0, 0]), { channels: 3, into });
  assertEquals(into[0], 0);
});

test("convertToGrayscale ignores alpha in RGBA input", () => {
  const transparent = new Uint8Array(1);
  const opaque = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([200, 100, 50, 0]), {
    channels: 4,
    into: transparent,
  });
  convertToGrayscale(Uint8Array.from([200, 100, 50, 255]), {
    channels: 4,
    into: opaque,
  });
  assertEquals(transparent[0], opaque[0]);
});

test("convertToGrayscale reads RGB from the first three bytes of RGBA", () => {
  const into = new Uint8Array(1);
  convertToGrayscale(Uint8Array.from([0, 0, 255, 0]), { channels: 4, into });
  assertEquals(into[0], 29);
});

test("convertToGrayscale copies bytes when channels is 1", () => {
  const frame = Uint8Array.from([0, 17, 128, 255]);
  const into = new Uint8Array(4);
  convertToGrayscale(frame, { channels: 1, into });
  assertEquals(into, Uint8Array.from([0, 17, 128, 255]));
});

test("convertToGrayscale returns the into buffer", () => {
  const into = new Uint8Array(1);
  const result = convertToGrayscale(Uint8Array.from([0, 0, 0]), {
    channels: 3,
    into,
  });
  assertStrictEquals(result, into);
});
