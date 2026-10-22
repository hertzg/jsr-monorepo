/**
 * Motion detection settings: where on the picture motion raises `VMD`.
 *
 * The document lives at two paths. An NVR keeps a copy for each IP camera at
 * `/ISAPI/ContentMgmt/InputProxy/channels/<n>/video/motionDetection`; a
 * device's own video input is at
 * `/ISAPI/System/Video/inputs/channels/<n>/motionDetection`.
 *
 * A device describes the area in one of two ways, named by `<regionType>`:
 * `grid` is a bitmap of cells, `region` a list of drawn polygons. Many
 * cameras store both: the polygons under `<RegionList>` and their own
 * rasterization of them under `<gridMap>`, in the same `<layout>`.
 *
 * ```xml
 * <MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
 * <enabled>true</enabled>
 * <enableHighlight>true</enableHighlight>
 * <samplingInterval>2</samplingInterval>
 * <startTriggerTime>500</startTriggerTime>
 * <endTriggerTime>500</endTriggerTime>
 * <regionType>grid</regionType>
 * <Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>
 * <MotionDetectionLayout version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
 * <sensitivityLevel>60</sensitivityLevel>
 * <layout>
 * <gridMap>fffffcfffffc…</gridMap>
 * <RegionList size="4">
 * <Region>
 * <id>1</id>
 * <RegionCoordinatesList>
 * <RegionCoordinates><positionX>0</positionX><positionY>0</positionY></RegionCoordinates>
 * …
 * </RegionCoordinatesList>
 * </Region>
 * </RegionList>
 * </layout>
 * <targetType>human,vehicle</targetType>
 * </MotionDetectionLayout>
 * </MotionDetection>
 * ```
 *
 * `<gridMap>` is decoded with `decodeGridMap` from
 * `@hertzg/hikvision-api/config/grid-map`, which also explains the encoding.
 * Region coordinates are in the device's normalized 1000 x 1000 screen
 * space. What a channel allows comes from
 * `@hertzg/hikvision-api/config/motion-capabilities`.
 *
 * @example Read a camera's drawn polygons
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMotionDetection } from "@hertzg/hikvision-api/config/motion-detection";
 *
 * const motion = parseMotionDetection(
 *   "<MotionDetection><enabled>true</enabled><regionType>region</regionType>" +
 *     "<MotionDetectionLayout><layout><RegionList><Region><id>1</id>" +
 *     "<RegionCoordinatesList>" +
 *     "<RegionCoordinates><positionX>0</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>1000</positionX><positionY>0</positionY></RegionCoordinates>" +
 *     "<RegionCoordinates><positionX>500</positionX><positionY>1000</positionY></RegionCoordinates>" +
 *     "</RegionCoordinatesList></Region></RegionList></layout>" +
 *     "</MotionDetectionLayout></MotionDetection>",
 * );
 *
 * assertEquals(motion.grid, undefined);
 * assertEquals(motion.regions, [{
 *   id: 1,
 *   coordinates: [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 500, y: 1000 }],
 * }]);
 * ```
 *
 * @module
 */

import { type RequestOptions, requestXml } from "../request.ts";
import {
  element,
  elements,
  parseIsapi,
  type Point,
  points,
  present,
  requireText,
  text,
  tokens,
} from "../xml.ts";
import { decodeGridMap } from "./grid-map.ts";
import type { XmlElement } from "@std/xml";

/** Which motion detection document to read. */
export type MotionDetectionTarget = {
  /** The channel number, from 1. */
  channel: number;
  /** `true` reads the NVR's copy under `/ISAPI/ContentMgmt/InputProxy`, `false` (the default) the device's own video input. */
  proxy?: boolean;
};

/** One `<Region>` under `<RegionList>`: a drawn polygon. */
export type MotionRegion = {
  /** `<id>`, from 1. */
  id: number;
  /** The polygon's corners in the normalized 1000 x 1000 screen space. */
  coordinates: Point[];
};

/** The fields of `<MotionDetection>`. */
export type MotionDetection = {
  /** `<enabled>`; `false` when the element is missing. */
  enabled: boolean;
  /** `<enableHighlight>`: draw motion on the live picture, when present. */
  enableHighlight?: boolean;
  /** `<samplingInterval>`: frames between two compared pictures, when present. */
  samplingIntervalFrames?: number;
  /** `<startTriggerTime>`: milliseconds of motion before the alarm starts, when present. */
  startTriggerTimeMs?: number;
  /** `<endTriggerTime>`: milliseconds of stillness before the alarm ends, when present. */
  endTriggerTimeMs?: number;
  /** `<regionType>`: `grid`, `roi`, `none`, `region`, or whatever else the device sent. */
  regionType?:
    | "grid"
    | "roi"
    | "none"
    | "region"
    | (string & Record<never, never>);
  /** `<rowGranularity>`: rows in the grid, when `<Grid>` is present. */
  rows?: number;
  /** `<columnGranularity>`: columns in the grid, when `<Grid>` is present. */
  columns?: number;
  /** `<sensitivityLevel>`, 0 to 100. */
  sensitivityLevel?: number;
  /** `<gridMap>` decoded, `grid[row][column]` being `true` where motion counts. */
  grid?: boolean[][];
  /** The `<RegionList>` polygons in document order, when there is at least one. */
  regions?: MotionRegion[];
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
 * Parses a `<MotionDetection>` document.
 *
 * `grid` is set when the document has a `<gridMap>` and a `<Grid>` to size
 * it, `regions` when its `<RegionList>` has entries.
 *
 * @param xml The document text.
 * @returns The settings, with the grid decoded.
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
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
 * assertEquals(motion.grid?.[17][21], true);
 * assertEquals(motion.regions, undefined);
 * ```
 */
export function parseMotionDetection(xml: string): MotionDetection {
  return parseFields(parseIsapi(xml));
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
  return parseFields(await requestXml(options, motionDetectionPath(target)));
}

function parseFields(root: XmlElement): MotionDetection {
  const size = parseGridSize(root);
  const layout = element(root, "MotionDetectionLayout");
  const map = layout && element(layout, "layout");
  const gridMap = map && text(map, "gridMap");
  const regions = map === undefined ? [] : parseRegions(map);
  return {
    enabled: text(root, "enabled") === "true",
    ...present({
      enableHighlight: readBoolean(root, "enableHighlight"),
      samplingIntervalFrames: readNumber(root, "samplingInterval"),
      startTriggerTimeMs: readNumber(root, "startTriggerTime"),
      endTriggerTimeMs: readNumber(root, "endTriggerTime"),
      regionType: text(root, "regionType"),
      ...size,
      sensitivityLevel: layout && readNumber(layout, "sensitivityLevel"),
      grid: gridMap === undefined || size === undefined
        ? undefined
        : decodeGridMap(gridMap, size),
      regions: regions.length === 0 ? undefined : regions,
      targetType: layout && readTokens(layout, "targetType"),
    }),
  };
}

function parseGridSize(
  root: XmlElement,
): { rows: number; columns: number } | undefined {
  const grid = element(root, "Grid");
  return grid && {
    rows: Number(requireText(grid, "rowGranularity")),
    columns: Number(requireText(grid, "columnGranularity")),
  };
}

function parseRegions(map: XmlElement): MotionRegion[] {
  const list = element(map, "RegionList");
  return list === undefined ? [] : elements(list, "Region").map((region) => {
    const corners = element(region, "RegionCoordinatesList");
    return {
      id: Number(requireText(region, "id")),
      coordinates: corners === undefined ? [] : points(corners),
    };
  });
}

function readBoolean(parent: XmlElement, name: string): boolean | undefined {
  const value = text(parent, name);
  return value === undefined ? undefined : value === "true";
}

function readNumber(parent: XmlElement, name: string): number | undefined {
  const value = text(parent, name);
  return value === undefined ? undefined : Number(value);
}

function readTokens(parent: XmlElement, name: string): string[] | undefined {
  const value = text(parent, name);
  return value === undefined ? undefined : tokens(value);
}
