/**
 * Motion detection settings: the grid of cells that trigger `VMD`.
 *
 * The document lives at two paths. An NVR keeps a copy for each IP camera at
 * `/ISAPI/ContentMgmt/InputProxy/channels/<n>/video/motionDetection`; a
 * device's own video input is at
 * `/ISAPI/System/Video/inputs/channels/<n>/motionDetection`.
 *
 * ```xml
 * <MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
 * <enabled>true</enabled>
 * <regionType>grid</regionType>
 * <Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>
 * <MotionDetectionLayout version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
 * <sensitivityLevel>60</sensitivityLevel>
 * <layout><gridMap>fffffcfffffc…</gridMap></layout>
 * <targetType>human,vehicle</targetType>
 * </MotionDetectionLayout>
 * </MotionDetection>
 * ```
 *
 * `<gridMap>` is hex, one row after another. Each row is padded to whole
 * bytes: 22 columns take 24 bits, so 18 rows are 108 hex digits. The first
 * column is the most significant bit of the row.
 *
 * @example Decode and re-encode a grid
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeGridMap, encodeGridMap } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * const grid = decodeGridMap("c00000000004", 2, 22);
 *
 * assertEquals(grid[0].slice(0, 3), [true, true, false]);
 * assertEquals(grid[1][21], true);
 * assertEquals(encodeGridMap(grid), "c00000000004");
 * ```
 *
 * @module
 */

import { type RequestOptions, requestXml } from "../request.ts";
import { element, parseIsapi, requireText, text, tokens } from "../xml.ts";
import type { XmlElement } from "@std/xml";

/** Which motion detection document to read. */
export type MotionDetectionTarget = {
  /** The channel number, from 1. */
  channel: number;
  /**
   * `true` reads the NVR's copy of an IP camera's settings
   * (`/ISAPI/ContentMgmt/InputProxy/channels/<n>/video/motionDetection`),
   * `false` the device's own video input
   * (`/ISAPI/System/Video/inputs/channels/<n>/motionDetection`). Defaults
   * to `false`.
   */
  proxy?: boolean;
};

/** The fields of `<MotionDetection>`. */
export type MotionDetection = {
  /** `<enabled>`. */
  enabled: boolean;
  /** `<regionType>`, `grid` on every device seen so far. */
  regionType?: string;
  /** `<rowGranularity>`: rows in the grid. */
  rows: number;
  /** `<columnGranularity>`: columns in the grid. */
  columns: number;
  /** `<sensitivityLevel>`, 0 to 100. */
  sensitivityLevel?: number;
  /** `<gridMap>` decoded: `grid[row][column]` is `true` where motion counts. */
  grid: boolean[][];
  /** `<targetType>` split on commas, such as `["human", "vehicle"]`; newer cameras only. */
  targetType?: string[];
};

/**
 * The path of a motion detection document.
 *
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns The ISAPI path.
 *
 * @example Both paths
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { motionDetectionPath } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * assertEquals(
 *   motionDetectionPath({ channel: 3, proxy: true }),
 *   "/ISAPI/ContentMgmt/InputProxy/channels/3/video/motionDetection",
 * );
 * assertEquals(
 *   motionDetectionPath({ channel: 1 }),
 *   "/ISAPI/System/Video/inputs/channels/1/motionDetection",
 * );
 * ```
 */
export function motionDetectionPath(target: MotionDetectionTarget): string {
  return target.proxy
    ? `/ISAPI/ContentMgmt/InputProxy/channels/${target.channel}/video/motionDetection`
    : `/ISAPI/System/Video/inputs/channels/${target.channel}/motionDetection`;
}

/**
 * Decodes a `<gridMap>` into rows of booleans.
 *
 * @param gridMap The hex text.
 * @param rows The row count, from `<rowGranularity>`.
 * @param columns The column count, from `<columnGranularity>`.
 * @returns `rows` arrays of `columns` booleans.
 *
 * @example The NVR default: every cell on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { decodeGridMap } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * const grid = decodeGridMap("fffffc".repeat(18), 18, 22);
 *
 * assertEquals(grid.length, 18);
 * assertEquals(grid.every((row) => row.length === 22 && row.every(Boolean)), true);
 * ```
 */
export function decodeGridMap(
  gridMap: string,
  rows: number,
  columns: number,
): boolean[][] {
  const digitsPerRow = Math.ceil(columns / 8) * 2;
  return Array.from({ length: rows }, (_, row) => {
    const bits = BigInt(
      `0x${gridMap.slice(row * digitsPerRow, (row + 1) * digitsPerRow)}`,
    );
    const width = BigInt(digitsPerRow * 4);
    return Array.from(
      { length: columns },
      (_, column) => ((bits >> (width - 1n - BigInt(column))) & 1n) === 1n,
    );
  });
}

/**
 * Encodes rows of booleans as a `<gridMap>`.
 *
 * @param grid `grid[row][column]`, every row the same length.
 * @returns The hex text, rows padded to whole bytes.
 *
 * @example Only the top-left cell on
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { encodeGridMap } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * const grid = Array.from({ length: 2 }, () => Array.from({ length: 22 }, () => false));
 * grid[0][0] = true;
 *
 * assertEquals(encodeGridMap(grid), "800000000000");
 * ```
 */
export function encodeGridMap(grid: boolean[][]): string {
  return grid.map((row) => {
    const digits = Math.ceil(row.length / 8) * 2;
    const width = BigInt(digits * 4);
    const bits = row.reduce(
      (acc, cell, column) =>
        cell ? acc | (1n << (width - 1n - BigInt(column))) : acc,
      0n,
    );
    return bits.toString(16).padStart(digits, "0");
  }).join("");
}

/**
 * Parses a `<MotionDetection>` document.
 *
 * @param xml The document text.
 * @returns The settings, with the grid decoded.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
 * @throws {Error} When the grid size or map is missing.
 *
 * @example Parse an NVR's copy of a camera's settings
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMotionDetection } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * const motion = parseMotionDetection(
 *   "<MotionDetection><enabled>true</enabled><regionType>grid</regionType>" +
 *     "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>" +
 *     "<MotionDetectionLayout><sensitivityLevel>60</sensitivityLevel>" +
 *     `<layout><gridMap>${"fffffc".repeat(18)}</gridMap></layout>` +
 *     "<targetType>human,vehicle</targetType></MotionDetectionLayout></MotionDetection>",
 * );
 *
 * assertEquals(motion.enabled, true);
 * assertEquals(motion.sensitivityLevel, 60);
 * assertEquals(motion.targetType, ["human", "vehicle"]);
 * assertEquals(motion.grid[17][21], true);
 * ```
 */
export function parseMotionDetection(xml: string): MotionDetection {
  return motionDetection(parseIsapi(xml));
}

/**
 * Reads a motion detection document from a device.
 *
 * @param options Where the device is and how to log in.
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns The settings, with the grid decoded.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read channel 2 through an NVR
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readMotionDetection } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     "<MotionDetection><enabled>false</enabled>" +
 *       "<Grid><rowGranularity>1</rowGranularity><columnGranularity>8</columnGranularity></Grid>" +
 *       "<MotionDetectionLayout><layout><gridMap>0f</gridMap></layout></MotionDetectionLayout>" +
 *       "</MotionDetection>",
 *   ),
 * ]));
 *
 * const motion = await readMotionDetection(
 *   { baseUrl: "http://192.0.2.10", username: "admin", password: "hunter2", fetch },
 *   { channel: 2, proxy: true },
 * );
 *
 * assertEquals(motion.grid, [[false, false, false, false, true, true, true, true]]);
 * assertEquals(
 *   fetch.calls[0].args[0],
 *   "http://192.0.2.10/ISAPI/ContentMgmt/InputProxy/channels/2/video/motionDetection",
 * );
 * ```
 */
export async function readMotionDetection(
  options: RequestOptions,
  target: MotionDetectionTarget,
): Promise<MotionDetection> {
  return motionDetection(
    await requestXml(options, motionDetectionPath(target)),
  );
}

function motionDetection(root: XmlElement): MotionDetection {
  const size = element(root, "Grid");
  if (size === undefined) {
    throw new Error("ISAPI <MotionDetection> has no <Grid>");
  }
  const layout = element(root, "MotionDetectionLayout");
  const map = layout === undefined ? undefined : element(layout, "layout");
  if (layout === undefined || map === undefined) {
    throw new Error(
      "ISAPI <MotionDetection> has no <MotionDetectionLayout>/<layout>",
    );
  }
  const rows = Number(requireText(size, "rowGranularity"));
  const columns = Number(requireText(size, "columnGranularity"));
  const motion: MotionDetection = {
    enabled: text(root, "enabled") === "true",
    rows,
    columns,
    grid: decodeGridMap(requireText(map, "gridMap"), rows, columns),
  };
  const regionType = text(root, "regionType");
  if (regionType !== undefined) {
    motion.regionType = regionType;
  }
  const sensitivityLevel = text(layout, "sensitivityLevel");
  if (sensitivityLevel !== undefined) {
    motion.sensitivityLevel = Number(sensitivityLevel);
  }
  const targetType = text(layout, "targetType");
  if (targetType !== undefined) {
    motion.targetType = tokens(targetType);
  }
  return motion;
}
