/**
 * What `…/motionDetection/capabilities` allows for a channel.
 *
 * The device answers a `<MotionDetection>` whose values carry the allowed
 * range as attributes: `<regionType opt="grid,region">`,
 * `<sensitivityLevel min="0" max="100" step="20">`,
 * `<regionEdgesNum min="4" max="10"/>`. The path is the settings path from
 * `motion-detection.ts` plus `/capabilities`.
 *
 * ```xml
 * <MotionDetection version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
 * <enabled opt="true,false">true</enabled>
 * <regionType opt="grid,region">grid</regionType>
 * <Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>
 * <MotionDetectionLayout version="2.0" xmlns="http://www.isapi.org/ver20/XMLSchema">
 * <sensitivityLevel min="0" max="100" step="20">60</sensitivityLevel>
 * <targetType opt="human,vehicle">human,vehicle</targetType>
 * </MotionDetectionLayout>
 * <regionEdgesNum min="4" max="10"/>
 * </MotionDetection>
 * ```
 *
 * @example Read what a channel allows
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { motionDetectionCapabilities } from "./motion-detection-capabilities.ts";
 *
 * const capabilities = motionDetectionCapabilities({ channel: 1 }).codec.parse(
 *   '<MotionDetection><regionType opt="grid">grid</regionType>' +
 *     "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>" +
 *     "</MotionDetection>",
 * );
 *
 * assertEquals(capabilities, {
 *   regionTypes: ["grid"],
 *   rows: 18,
 *   columns: 22,
 *   targetTypes: [],
 * });
 * ```
 *
 * @module
 */

import {
  attribute,
  attributes,
  document,
  int,
  obj,
  optional,
  splitTokens,
} from "../document.ts";
import type { Resource } from "../request.ts";
import {
  motionDetection,
  type MotionDetectionTarget,
} from "./motion-detection.ts";

/** What `…/motionDetection/capabilities` allows for a channel. */
export type MotionDetectionCapabilities = {
  /** `<regionType opt>`: the region types the device accepts; `[]` without one. */
  regionTypes: string[];
  /** `<rowGranularity>`: rows in the grid, when `<Grid>` is present. */
  rows?: number;
  /** `<columnGranularity>`: columns in the grid, when `<Grid>` is present. */
  columns?: number;
  /** `<sensitivityLevel min max step>`, when present; each attribute the device states. */
  sensitivityLevel?: {
    /** The lowest allowed level. */
    min?: number;
    /** The highest allowed level. */
    max?: number;
    /** The distance between allowed levels. */
    step?: number;
  };
  /** `<targetType opt>`: the detection targets the device accepts; `[]` without one. */
  targetTypes: string[];
  /** `<regionEdgesNum min max>`: how many corners a region may have, when present. */
  regionEdges?: {
    /** The fewest corners. */
    min?: number;
    /** The most corners. */
    max?: number;
  };
};

// The ranges live under <MotionDetectionLayout> on most firmware and at the
// root on some, so the same fields are described in both places.
const ranges = {
  sensitivityLevel: optional(
    attributes({ min: Number, max: Number, step: Number }),
  ),
  targetType: optional(attribute("opt", splitTokens)),
  regionEdgesNum: optional(attributes({ min: Number, max: Number })),
};

const capabilitiesWire = document({
  regionType: optional(attribute("opt", splitTokens)),
  Grid: optional(obj({ rowGranularity: int(), columnGranularity: int() })),
  MotionDetectionLayout: optional(obj(ranges)),
  ...ranges,
});

type MotionDetectionCapabilitiesWire = ReturnType<
  typeof capabilitiesWire.parse
>;

// a stateless description
const codec = capabilitiesWire.map(toCapabilities);

/**
 * The motion detection capabilities resource of one channel.
 *
 * The path is the settings path from {@link motionDetection} plus
 * `/capabilities`.
 *
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns The resource: its path, and a codec that reads what the channel allows.
 *
 * @example A camera's own input
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { motionDetectionCapabilities } from "./motion-detection-capabilities.ts";
 *
 * assertEquals(
 *   motionDetectionCapabilities({ channel: 1 }).path,
 *   "/ISAPI/System/Video/inputs/channels/1/motionDetection/capabilities",
 * );
 * ```
 *
 * @example A camera that draws regions and rasterizes them into an 18 x 22 grid
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { request } from "../request.ts";
 * import { motionDetectionCapabilities } from "./motion-detection-capabilities.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     '<MotionDetection><enabled opt="true,false">true</enabled>' +
 *       '<regionType opt="grid,region">grid</regionType>' +
 *       "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>" +
 *       '<MotionDetectionLayout><sensitivityLevel min="0" max="100" step="20">60</sensitivityLevel>' +
 *       '<targetType opt="human,vehicle">human,vehicle</targetType></MotionDetectionLayout>' +
 *       '<regionEdgesNum min="4" max="10"/></MotionDetection>',
 *   ),
 * ]));
 *
 * const capabilities = await request(
 *   { baseUrl: "http://192.0.2.21", username: "admin", password: "hunter2", fetch },
 *   motionDetectionCapabilities({ channel: 1 }),
 * );
 *
 * assertEquals(capabilities, {
 *   regionTypes: ["grid", "region"],
 *   rows: 18,
 *   columns: 22,
 *   sensitivityLevel: { min: 0, max: 100, step: 20 },
 *   targetTypes: ["human", "vehicle"],
 *   regionEdges: { min: 4, max: 10 },
 * });
 * assertEquals(
 *   fetch.calls[0].args[0],
 *   "http://192.0.2.21/ISAPI/System/Video/inputs/channels/1/motionDetection/capabilities",
 * );
 * ```
 */
export function motionDetectionCapabilities(
  target: MotionDetectionTarget,
): Resource<MotionDetectionCapabilities> {
  return { path: `${motionDetection(target).path}/capabilities`, codec };
}

/** Merges the two places a range may sit, the layout's winning over the root's. */
function toCapabilities(
  wire: MotionDetectionCapabilitiesWire,
): MotionDetectionCapabilities {
  const { regionType = [], Grid, MotionDetectionLayout, ...atRoot } = wire;
  const { sensitivityLevel, targetType = [], regionEdgesNum } = {
    ...atRoot,
    ...MotionDetectionLayout,
  };
  return {
    regionTypes: regionType,
    ...(Grid && { rows: Grid.rowGranularity, columns: Grid.columnGranularity }),
    ...(sensitivityLevel && { sensitivityLevel }),
    targetTypes: targetType,
    ...(regionEdgesNum && { regionEdges: regionEdgesNum }),
  };
}
