import { assertEquals } from "@std/assert";
import { decodeGridMap, encodeGridMap } from "./grid-map.ts";

Deno.test("decodeGridMap reads 22 columns from 24-bit rows, first column first", () => {
  const grid = decodeGridMap("800001" + "fffffc", { rows: 2, columns: 22 });

  assertEquals(grid[0][0], true);
  assertEquals(grid[0].slice(1).every((cell) => cell === false), true);
  assertEquals(grid[1].every((cell) => cell === true), true);
  assertEquals(grid[1].length, 22);
});

Deno.test("decodeGridMap pads a row to whole bytes", () => {
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

Deno.test("encodeGridMap writes rows padded to whole bytes, first column first", () => {
  const empty = Array.from({ length: 22 }, () => false);
  const top = [...empty];
  top[0] = true;
  const bottom = [...empty];
  bottom[21] = true;

  assertEquals(encodeGridMap([top, bottom]), "800000000004");
});

Deno.test("encodeGridMap round-trips the NVR default of every cell on", () => {
  const gridMap = "fffffc".repeat(18);

  assertEquals(
    encodeGridMap(decodeGridMap(gridMap, { rows: 18, columns: 22 })),
    gridMap,
  );
});
