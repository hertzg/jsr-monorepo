/**
 * What `…/motionDetection/capabilities` allows for a channel.
 *
 * The device answers a `<MotionDetection>` whose values carry the allowed
 * range as attributes: `<regionType opt="grid,region">`,
 * `<sensitivityLevel min="0" max="100" step="20">`,
 * `<regionEdgesNum min="4" max="10"/>`. The path is the settings path from
 * `@hertzg/hikvision-api/config/motion-detection` plus `/capabilities`.
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
 * import { parseMotionDetectionCapabilities } from "@hertzg/hikvision-api/config/motion-capabilities";
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

import { type RequestOptions, requestXml } from "../request.ts";
import { element, parseIsapi, present, requireText, tokens } from "../xml.ts";
import {
  motionDetectionPath,
  type MotionDetectionTarget,
} from "./motion-detection.ts";
import type { XmlElement } from "@std/xml";

/** What `…/motionDetection/capabilities` allows for a channel. */
export type MotionDetectionCapabilities = {
  /** `<regionType opt>`: the region types the device accepts. */
  regionTypes: string[];
  /** `<rowGranularity>`: rows in the grid, when `<Grid>` is present. */
  rows?: number;
  /** `<columnGranularity>`: columns in the grid, when `<Grid>` is present. */
  columns?: number;
  /** `<sensitivityLevel min max step>`, when present. */
  sensitivityLevel?: {
    /** The lowest allowed level. */
    min: number;
    /** The highest allowed level. */
    max: number;
    /** The distance between allowed levels, when the device states one. */
    step?: number;
  };
  /** `<targetType opt>`: the detection targets the device accepts; `[]` without one. */
  targetTypes: string[];
  /** `<regionEdgesNum min max>`: how many corners a region may have, when present. */
  regionEdges?: {
    /** The fewest corners. */
    min: number;
    /** The most corners. */
    max: number;
  };
};

/**
 * The path of a motion detection capabilities document.
 *
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns The ISAPI path: the settings path plus `/capabilities`.
 *
 * @example A camera's own input
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { motionDetectionCapabilitiesPath } from "@hertzg/hikvision-api/config/motion-capabilities";
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
 * @throws {IsapiError} When the document is a failing `<ResponseStatus>`.
 *
 * @example A camera that draws regions and rasterizes them into an 18 x 22 grid
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parseMotionDetectionCapabilities } from "@hertzg/hikvision-api/config/motion-capabilities";
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
  return parseFields(parseIsapi(xml));
}

/**
 * Reads a channel's motion detection capabilities from a device.
 *
 * @param options Where the device is and how to log in.
 * @param target Which channel, and whether through an NVR's input proxy.
 * @returns What the channel allows.
 * @throws {HttpError} When the device answers with a status outside 2xx.
 * @throws {IsapiError} When the device answers a failing `<ResponseStatus>`.
 *
 * @example Read what channel 1 allows
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { resolvesNext, spy } from "@std/testing/mock";
 * import { readMotionDetectionCapabilities } from "@hertzg/hikvision-api/config/motion-capabilities";
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
  return parseFields(
    await requestXml(options, motionDetectionCapabilitiesPath(target)),
  );
}

function parseFields(root: XmlElement): MotionDetectionCapabilities {
  const layout = element(root, "MotionDetectionLayout") ?? root;
  const grid = element(root, "Grid");
  const sensitivity = element(layout, "sensitivityLevel") ??
    element(root, "sensitivityLevel");
  const targets = element(layout, "targetType") ??
    element(root, "targetType");
  const edges = element(root, "regionEdgesNum") ??
    element(layout, "regionEdgesNum");
  return {
    regionTypes: tokens(element(root, "regionType")?.attributes["opt"]),
    targetTypes: tokens(targets?.attributes["opt"]),
    ...present({
      rows: grid && Number(requireText(grid, "rowGranularity")),
      columns: grid && Number(requireText(grid, "columnGranularity")),
      sensitivityLevel: sensitivity && readSensitivityRange(sensitivity),
      regionEdges: edges && readRange(edges),
    }),
  };
}

function readSensitivityRange(
  node: XmlElement,
): NonNullable<MotionDetectionCapabilities["sensitivityLevel"]> {
  const step = node.attributes["step"];
  return {
    ...readRange(node),
    ...present({ step: step === undefined ? undefined : Number(step) }),
  };
}

function readRange(node: XmlElement): { min: number; max: number } {
  return {
    min: Number(node.attributes["min"]),
    max: Number(node.attributes["max"]),
  };
}
