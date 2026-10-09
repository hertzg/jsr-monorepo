/**
 * `<IOTAction>`: one IoT action, which triggers a bound device on chosen
 * alarm types during a weekly schedule (cmd 395 sets it; cmd 394 replies
 * with `<IOTActionList>` instead).
 *
 * Firmware: `nets_param_IoT_action_x2s` reads every field when present and
 * skips the rest, so each one may be missing. No code writes `<IOTAction>`.
 *
 * @example Build an action that fires on people and vehicles
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { iotAction } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = iotAction.encode({
 *   channelBits: 1n,
 *   setState: 1,
 *   actionID: 0,
 *   alarmType: "people,vehicle",
 *   timeTable: "1".repeat(168),
 * });
 *
 * assertStringIncludes(xml, "<alarmType>people,vehicle</alarmType>");
 * ```
 *
 * @module
 */

import { int, optional, text, u64, type XmlParam, xmlParam } from "../xml.ts";

/** One IoT action in `<IOTAction>`. */
export type IotAction = {
  /** Channel bit mask. */
  channelBits?: bigint;
  /** Device state to set, as a number. */
  setState?: number;
  /** Action id. */
  actionID?: number;
  /** Device name. */
  name?: string;
  /** Device uid. */
  uid?: string;
  /** Action content. */
  content?: string;
  /**
   * Alarm types that trigger the action. The parser searches the text for
   * each of `md`, `pir`, `people`, `vehicle`, `face`, `dog_cat`, `other`,
   * `visitor`, `BTC` and `CTB`, ignoring case, and `none` clears them all.
   */
  alarmType?: string;
  /**
   * Weekly schedule: seven days of 24 hours, one character per hour (168 in
   * all). `1` turns an hour on and anything else turns it off. Which day
   * comes first is not established. The parser rejects an empty value.
   */
  timeTable?: string;
};

/**
 * Codec for `<IOTAction>`.
 *
 * @example Read back an action
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { iotAction } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<IOTAction version="1.1"><channelBits>3</channelBits>' +
 *     "<actionID>2</actionID></IOTAction>",
 * ).root;
 *
 * assertEquals(iotAction.decode(root), { channelBits: 3n, actionID: 2 });
 * ```
 */
export const iotAction: XmlParam<"IOTAction", IotAction> = xmlParam(
  "IOTAction",
  {
    channelBits: optional(u64()),
    setState: optional(int()),
    actionID: optional(int()),
    name: optional(text()),
    uid: optional(text()),
    content: optional(text()),
    alarmType: optional(text()),
    timeTable: optional(text()),
  },
);
