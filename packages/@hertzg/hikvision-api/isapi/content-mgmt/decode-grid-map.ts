/**
 * The `<gridMap>` of a motion detection layout: which cells of the grid
 * count motion.
 *
 * The text is hex. Rows come top to bottom, and inside a row column 0 is
 * the most significant bit. Every row is padded to whole bytes, so 22
 * columns take 24 bits (6 hex digits) and an 18 x 22 grid is 108 digits:
 *
 * ```text
 * fffffc   row 0: all 22 cells on, 2 padding bits off
 * 800000   row 1: only column 0 on
 * 000004   row 2: only column 21 on
 * ```
 *
 * @example Decode and re-encode a grid
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeGridMap } from "./decode-grid-map.ts";
 * import { encodeGridMap } from "./encode-grid-map.ts";
 *
 * const grid = decodeGridMap("c00000000004", { rows: 2, columns: 22 });
 *
 * assertEquals(grid[0].slice(0, 3), [true, true, false]);
 * assertEquals(grid[1][21], true);
 * assertEquals(encodeGridMap(grid), "c00000000004");
 * ```
 *
 * @module
 */

/**
 * Decodes a `<gridMap>` into rows of booleans.
 *
 * @param gridMap The hex text.
 * @param size The grid's `<rowGranularity>` and `<columnGranularity>`.
 * @returns `size.rows` arrays of `size.columns` booleans.
 *
 * @example The NVR default: every cell on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeGridMap } from "./decode-grid-map.ts";
 *
 * const grid = decodeGridMap("fffffc".repeat(18), { rows: 18, columns: 22 });
 *
 * assertEquals(grid.length, 18);
 * assertEquals(grid.every((row) => row.length === 22 && row.every(Boolean)), true);
 * ```
 */
export function decodeGridMap(
  gridMap: string,
  size: { rows: number; columns: number },
): boolean[][] {
  const rowHexDigits = hexDigitsPerRow(size.columns);
  const rowWidthBits = BigInt(rowHexDigits * 4);
  return Array.from({ length: size.rows }, (_, row) => {
    const bits = BigInt(
      `0x${gridMap.slice(row * rowHexDigits, (row + 1) * rowHexDigits)}`,
    );
    return Array.from(
      { length: size.columns },
      (_, column) =>
        ((bits >> (rowWidthBits - 1n - BigInt(column))) & 1n) === 1n,
    );
  });
}

/** The hex digits one row takes: its columns rounded up to whole bytes. */
function hexDigitsPerRow(columns: number): number {
  return Math.ceil(columns / 8) * 2;
}
