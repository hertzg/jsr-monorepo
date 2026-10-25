import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { decodeGridMap } from "./decode-grid-map.ts";
import { encodeGridMap } from "./encode-grid-map.ts";

test("encodeGridMap writes rows padded to whole bytes, first column first", () => {
  const empty = Array.from({ length: 22 }, () => false);
  const top = [...empty];
  top[0] = true;
  const bottom = [...empty];
  bottom[21] = true;

  assertEquals(encodeGridMap([top, bottom]), "800000000004");
});

test("encodeGridMap round-trips the NVR default of every cell on", () => {
  const gridMap = "fffffc".repeat(18);

  assertEquals(
    encodeGridMap(decodeGridMap(gridMap, { rows: 18, columns: 22 })),
    gridMap,
  );
});
