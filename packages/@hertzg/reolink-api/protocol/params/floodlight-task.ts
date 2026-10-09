/**
 * `<FloodlightTask>`: when and how the floodlight switches on by itself.
 * Read with cmd 289, written with cmd 290.
 *
 * Firmware: the cmd 289 handler writes every field, always.
 * `nets_param_floodlight_task_x2s` skips any field that is missing, so
 * every field is optional. `alarmMode` and `enable` are the same setting:
 * the handler writes the same value to both, and the parser stores either
 * one in the same place.
 *
 * @example Read the cmd 289 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { floodlightTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<FloodlightTask version="1.1"><channel>0</channel><alarmMode>1</alarmMode>' +
 *     "<enable>1</enable><preview_auto>0</preview_auto><duration>60</duration>" +
 *     "<brightness_cur>80</brightness_cur><brightness_max>100</brightness_max>" +
 *     "<brightness_min>1</brightness_min>" +
 *     "<schedule><startHour>18</startHour><startMin>0</startMin>" +
 *     "<endHour>6</endHour><endMin>0</endMin></schedule>" +
 *     "<lightAlarmSchedule><startHour>0</startHour><startMin>0</startMin>" +
 *     "<endHour>23</endHour><endMin>59</endMin></lightAlarmSchedule>" +
 *     "<detectType>people,vehicle</detectType></FloodlightTask>",
 * ).root;
 *
 * assertEquals(floodlightTask.decode(root).schedule?.startHour, 18);
 * ```
 *
 * @module
 */

import { int, obj, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** A daily time window in `<FloodlightTask>`. */
export type FloodlightSchedule = {
  /** Start hour, 0 to 23. */
  startHour?: number;
  /** Start minute, 0 to 59. */
  startMin?: number;
  /** End hour, 0 to 23. */
  endHour?: number;
  /** End minute, 0 to 59. */
  endMin?: number;
};

/** The automatic floodlight settings in `<FloodlightTask>`. */
export type FloodlightTask = {
  /** Zero-based channel; the firmware rejects a negative value. */
  channel?: number;
  /** 1 when motion switches the light on; the same setting as `enable`. */
  alarmMode?: number;
  /** The same setting as `alarmMode`. */
  enable?: number;
  /** 1 when the light switches on automatically for live view. */
  preview_auto?: number;
  /** How long the light stays on. */
  duration?: number;
  /** Current brightness. */
  brightness_cur?: number;
  /** Highest brightness. */
  brightness_max?: number;
  /** Lowest brightness. */
  brightness_min?: number;
  /** Night-light window. */
  schedule?: FloodlightSchedule;
  /** Window in which motion switches the light on. */
  lightAlarmSchedule?: FloodlightSchedule;
  /**
   * Objects that trigger the light, comma-separated: any of `people`,
   * `vehicle`, `face`, `other` and `dog_cat`, or `none`.
   */
  detectType?: string;
};

function schedule() {
  return obj({
    startHour: optional(int()),
    startMin: optional(int()),
    endHour: optional(int()),
    endMin: optional(int()),
  });
}

/**
 * Codec for `<FloodlightTask>`.
 *
 * @example Light up for people at night
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { floodlightTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = floodlightTask.encode({
 *   channel: 0,
 *   enable: 1,
 *   lightAlarmSchedule: { startHour: 20, startMin: 0, endHour: 6, endMin: 30 },
 *   detectType: "people",
 * });
 *
 * assertStringIncludes(xml, "<lightAlarmSchedule><startHour>20</startHour>");
 * ```
 */
export const floodlightTask: XmlParam<"FloodlightTask", FloodlightTask> =
  xmlParam("FloodlightTask", {
    channel: optional(int()),
    alarmMode: optional(int()),
    enable: optional(int()),
    preview_auto: optional(int()),
    duration: optional(int()),
    brightness_cur: optional(int()),
    brightness_max: optional(int()),
    brightness_min: optional(int()),
    schedule: optional(schedule()),
    lightAlarmSchedule: optional(schedule()),
    detectType: optional(text()),
  });
