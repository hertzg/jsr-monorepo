import { test } from "node:test";
import { assertEquals } from "@std/assert";
import { decodeGridMap } from "./decode-grid-map.ts";

test("decodeGridMap reads 22 columns from 24-bit rows, first column first", () => {
  const grid = decodeGridMap("800001" + "fffffc", { rows: 2, columns: 22 });

  assertEquals(grid[0][0], true);
  assertEquals(grid[0].slice(1).every((cell) => cell === false), true);
  assertEquals(grid[1].every((cell) => cell === true), true);
  assertEquals(grid[1].length, 22);
});

test("decodeGridMap pads a row to whole bytes", () => {
  assertEquals(decodeGridMap("0f", { rows: 1, columns: 8 }), [[
    false,
    false,
    false,
    false,
    true,
    true,
    true,
    true,
  ]]);
  assertEquals(decodeGridMap("c0", { rows: 1, columns: 2 }), [[true, true]]);
});
