/**
 * Encodes rows of booleans as a `<gridMap>`: hex text, rows top to bottom,
 * column 0 the most significant bit, each row padded to whole bytes.
 *
 * @module
 */

/**
 * Encodes rows of booleans as a `<gridMap>`.
 *
 * @param grid `grid[row][column]`, every row the same length.
 * @returns The hex text, rows padded to whole bytes.
 *
 * @example Only the top-left cell on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeGridMap } from "./encode-grid-map.ts";
 *
 * const grid = Array.from({ length: 2 }, () => Array.from({ length: 22 }, () => false));
 * grid[0][0] = true;
 *
 * assertEquals(encodeGridMap(grid), "800000000000");
 * ```
 */
export function encodeGridMap(grid: boolean[][]): string {
  return grid.map((row) => {
    const rowHexDigits = hexDigitsPerRow(row.length);
    const rowWidthBits = BigInt(rowHexDigits * 4);
    const bits = row.reduce(
      (acc, cell, column) =>
        cell ? acc | (1n << (rowWidthBits - 1n - BigInt(column))) : acc,
      0n,
    );
    return bits.toString(16).padStart(rowHexDigits, "0");
  }).join("");
}

/** The hex digits one row takes: its columns rounded up to whole bytes. */
function hexDigitsPerRow(columns: number): number {
  return Math.ceil(columns / 8) * 2;
}
