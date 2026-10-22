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
 * import { parseMotionDetectionCapabilities } from "./motion-capabilities.ts";
 *
 * const capabilities = parseMotionDetectionCapabilities(
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
} from "../isapi/document.ts";
import { readDocument, type RequestOptions } from "../isapi/request.ts";
import {
  motionDetectionPath,
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
// root on some, so the same fields are described in both places. A
// description, not state: it holds nothing, so one instance serves every call.
const ranges = {
  sensitivityLevel: optional(
    attributes({ min: Number, max: Number, step: Number }),
  ),
  targetType: optional(attribute("opt", splitTokens)),
  regionEdgesNum: optional(attributes({ min: Number, max: Number })),
};

const motionDetectionCapabilities = document({
  regionType: optional(attribute("opt", splitTokens)),
  Grid: optional(obj({ rowGranularity: int(), columnGranularity: int() })),
  MotionDetectionLayout: optional(obj(ranges)),
  ...ranges,
});

type MotionDetectionCapabilitiesWire = ReturnType<
  typeof motionDetectionCapabilities.parse
>;

/**
 * The path of a motion detection capabilities document.
 *
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns The ISAPI path: the settings path plus `/capabilities`.
 *
 * @example A camera's own input
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { motionDetectionCapabilitiesPath } from "./motion-capabilities.ts";
 *
 * assertEquals(
 *   motionDetectionCapabilitiesPath({ channel: 1 }),
 *   "/ISAPI/System/Video/inputs/channels/1/motionDetection/capabilities",
 * );
 * ```
 */
export function motionDetectionCapabilitiesPath(
  target: MotionDetectionTarget,
): string {
  return `${motionDetectionPath(target)}/capabilities`;
}

/**
 * Parses a `<MotionDetection>` capabilities document.
 *
 * @param xml The document text.
 * @returns What the channel allows.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example A camera that draws regions and rasterizes them into an 18 x 22 grid
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMotionDetectionCapabilities } from "./motion-capabilities.ts";
 *
 * const capabilities = parseMotionDetectionCapabilities(
 *   '<MotionDetection><enabled opt="true,false">true</enabled>' +
 *     '<regionType opt="grid,region">grid</regionType>' +
 *     "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>" +
 *     '<MotionDetectionLayout><sensitivityLevel min="0" max="100" step="20">60</sensitivityLevel>' +
 *     '<targetType opt="human,vehicle">human,vehicle</targetType></MotionDetectionLayout>' +
 *     '<regionEdgesNum min="4" max="10"/></MotionDetection>',
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
 * ```
 */
export function parseMotionDetectionCapabilities(
  xml: string,
): MotionDetectionCapabilities {
  return buildCapabilities(motionDetectionCapabilities.parse(xml));
}

/**
 * Reads a channel's motion detection capabilities from a device.
 *
 * @param options Where the device is and how to log in.
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns What the channel allows.
 * @throws {IsapiError} When the request fails: a status outside 2xx, or a failing `<ResponseStatus>` on any status.
 *
 * @example Read what channel 1 allows
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readMotionDetectionCapabilities } from "./motion-capabilities.ts";
 *
 * const fetch = spy(resolvesNext([
 *   new Response(
 *     '<MotionDetection><regionType opt="grid">grid</regionType>' +
 *       "<Grid><rowGranularity>18</rowGranularity><columnGranularity>22</columnGranularity></Grid>" +
 *       "</MotionDetection>",
 *   ),
 * ]));
 *
 * const capabilities = await readMotionDetectionCapabilities(
 *   { baseUrl: "http://192.0.2.21", username: "admin", password: "hunter2", fetch },
 *   { channel: 1 },
 * );
 *
 * assertEquals(capabilities.regionTypes, ["grid"]);
 * assertEquals(capabilities.rows, 18);
 * assertEquals(
 *   fetch.calls[0].args[0],
 *   "http://192.0.2.21/ISAPI/System/Video/inputs/channels/1/motionDetection/capabilities",
 * );
 * ```
 */
export async function readMotionDetectionCapabilities(
  options: RequestOptions,
  target: MotionDetectionTarget,
): Promise<MotionDetectionCapabilities> {
  return buildCapabilities(
    await readDocument(
      options,
      motionDetectionCapabilitiesPath(target),
      motionDetectionCapabilities,
    ),
  );
}

/** Merges the two places a range may sit, the layout's winning over the root's. */
function buildCapabilities(
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
