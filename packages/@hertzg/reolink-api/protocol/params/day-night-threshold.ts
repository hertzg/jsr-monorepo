/**
 * `<DayNightThreshold>`: the light level at which the camera switches
 * between day and night mode. Read with cmd 296, written with cmd 297.
 *
 * Firmware: `nets_param_day_night_threshold_s2x` writes every field,
 * always; it maps `threshold` and `stat` from numbers to names.
 * `nets_param_day_night_threshold_x2s` skips any field that is missing,
 * rejects a `channelId` above 63, rejects names outside the two it maps,
 * and rejects a `thresholdval` whose `cur` is not between `min` and `max`.
 * Every field is optional.
 *
 * @example Read the cmd 296 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dayNightThreshold } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<DayNightThreshold version="1.1"><channelId>0</channelId>' +
 *     "<threshold>custom</threshold><stat>night</stat>" +
 *     "<thresholdval><min>0</min><max>100</max><cur>40</cur></thresholdval>" +
 *     "</DayNightThreshold>",
 * ).root;
 *
 * assertEquals(dayNightThreshold.decode(root).thresholdval?.cur, 40);
 * ```
 *
 * @module
 */

import { int, obj, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The threshold range in `<DayNightThreshold>`. */
export type DayNightThresholdValue = {
  /** Lowest threshold. */
  min?: number;
  /** Highest threshold. */
  max?: number;
  /** Current threshold, between `min` and `max`. */
  cur?: number;
};

/** The day/night switch point in `<DayNightThreshold>`. */
export type DayNightThreshold = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** `default` uses the built-in threshold; `custom` uses `thresholdval`. */
  threshold?: "default" | "custom";
  /** The current mode. */
  stat?: "day" | "night";
  /** The custom threshold and its range. */
  thresholdval?: DayNightThresholdValue;
};

/**
 * Codec for `<DayNightThreshold>`.
 *
 * @example Set a custom threshold
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { dayNightThreshold } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = dayNightThreshold.encode({
 *   channelId: 0,
 *   threshold: "custom",
 *   thresholdval: { cur: 60 },
 * });
 *
 * assertStringIncludes(xml, "<thresholdval><cur>60</cur></thresholdval>");
 * ```
 */
export const dayNightThreshold: XmlParam<
  "DayNightThreshold",
  DayNightThreshold
> = xmlParam("DayNightThreshold", {
  channelId: optional(int()),
  threshold: optional(oneOf("default", "custom")),
  stat: optional(oneOf("day", "night")),
  thresholdval: optional(obj({
    min: optional(int()),
    max: optional(int()),
    cur: optional(int()),
  })),
});
