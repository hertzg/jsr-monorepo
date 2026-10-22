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
 * `<gridMap>` is decoded with `decodeGridMap` from `grid-map.ts`, which also
 * explains the encoding. Region coordinates are in the device's normalized
 * 1000 x 1000 screen space. What a channel allows comes from
 * `motion-capabilities.ts`.
 *
 * @example Read a camera's drawn polygons
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMotionDetection } from "./motion-detection.ts";
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

import {
  bool,
  document,
  int,
  list,
  obj,
  optional,
  type Point,
  points,
  text,
  tokens,
} from "../isapi/document.ts";
import { readDocument, type RequestOptions } from "../isapi/request.ts";
import { decodeGridMap } from "./grid-map.ts";

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

// The wire shape, keyed by element name. A description, not state: it holds
// nothing, so one instance serves every call.
const motionDetection = document({
  enabled: optional(bool()),
  enableHighlight: optional(bool()),
  samplingInterval: optional(int()),
  startTriggerTime: optional(int()),
  endTriggerTime: optional(int()),
  regionType: optional(text()),
  Grid: optional(obj({ rowGranularity: int(), columnGranularity: int() })),
  MotionDetectionLayout: optional(obj({
    sensitivityLevel: optional(int()),
    targetType: optional(tokens()),
    layout: optional(obj({
      gridMap: optional(text()),
      RegionList: list(
        "Region",
        obj({ id: int(), RegionCoordinatesList: points() }),
      ),
    })),
  })),
});

type MotionDetectionWire = ReturnType<typeof motionDetection.parse>;

/**
 * The path of a motion detection document.
 *
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns The ISAPI path.
 *
 * @example Both paths
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { motionDetectionPath } from "./motion-detection.ts";
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
 * import { parseMotionDetection } from "./motion-detection.ts";
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
  return buildMotionDetection(motionDetection.parse(xml));
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
 * import { readMotionDetection } from "./motion-detection.ts";
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
  return buildMotionDetection(
    await readDocument(options, motionDetectionPath(target), motionDetection),
  );
}

/** Turns the wire shape into the settings: units in the names, grid decoded. */
function buildMotionDetection(wire: MotionDetectionWire): MotionDetection {
  const {
    enabled = false,
    samplingInterval,
    startTriggerTime,
    endTriggerTime,
    Grid,
    MotionDetectionLayout,
    ...sameNamed
  } = wire;
  const { layout, ...level } = { ...MotionDetectionLayout };
  const size = Grid &&
    { rows: Grid.rowGranularity, columns: Grid.columnGranularity };
  const gridMap = layout?.gridMap;
  const grid = size && gridMap !== undefined
    ? decodeGridMap(gridMap, size)
    : undefined;
  const regions = (layout?.RegionList ?? []).map((
    { id, RegionCoordinatesList },
  ) => ({ id, coordinates: RegionCoordinatesList }));
  return {
    enabled,
    ...sameNamed,
    ...(samplingInterval !== undefined &&
      { samplingIntervalFrames: samplingInterval }),
    ...(startTriggerTime !== undefined &&
      { startTriggerTimeMs: startTriggerTime }),
    ...(endTriggerTime !== undefined && { endTriggerTimeMs: endTriggerTime }),
    ...size,
    ...level,
    ...(grid && { grid }),
    ...(regions.length > 0 && { regions }),
  };
}
