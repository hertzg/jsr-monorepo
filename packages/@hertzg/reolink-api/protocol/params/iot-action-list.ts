/**
 * `<IOTActionList>`: the IoT linkage actions in the cmd 394 reply. The
 * request names `<IOTAction>`, but the reply carries this element instead.
 *
 * Firmware: the cmd 394 handler writes one `<item>` per action, at most 64,
 * and writes every item field, always.
 *
 * @example Read the cmd 394 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { iotActionList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<IOTActionList version="1.1"><item><actionID>1</actionID>' +
 *     "<channelBits>1</channelBits><deviceType>2</deviceType>" +
 *     "<name>Porch light</name><uid>95270001ABCD</uid><content>on</content>" +
 *     "<alarmType>people,vehicle</alarmType>" +
 *     `<timeTable>${"1".repeat(168)}</timeTable></item></IOTActionList>`,
 * ).root;
 *
 * assertEquals(iotActionList.decode(root).item[0].alarmType, "people,vehicle");
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  repeated,
  text,
  u64,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One IoT linkage action, an `<item>` in `<IOTActionList>`. */
export type IotActionListItem = {
  /** Action id. */
  actionID: number;
  /** Channel bitmask, one bit per channel; written as a 64-bit number. */
  channelBits: bigint;
  /** Device type as a number; the firmware does not name the values. */
  deviceType: number;
  /** Device name. */
  name: string;
  /** Device uid. */
  uid: string;
  /** Action content; the firmware copies it through as text. */
  content: string;
  /**
   * Triggering alarm types joined with commas, such as `people,vehicle`,
   * or `none`. Names seen: people, vehicle, face, other, dog_cat, md, pir,
   * visitor, BTC, CTB, and package on the doorbell.
   */
  alarmType: string;
  /** Weekly schedule: 168 characters of `0` or `1`, one per hour. */
  timeTable: string;
};

/** The IoT linkage actions in `<IOTActionList>`. */
export type IotActionList = {
  /** The actions, one `<item>` each, at most 64. */
  item: IotActionListItem[];
};

/**
 * Codec for `<IOTActionList>`.
 *
 * @example Build an `<IOTActionList>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { iotActionList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = iotActionList.encode({
 *   item: [{
 *     actionID: 3,
 *     channelBits: 1n,
 *     deviceType: 1,
 *     name: "Garage plug",
 *     uid: "95270002EF01",
 *     content: "off",
 *     alarmType: "none",
 *     timeTable: "0".repeat(168),
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<item><actionID>3</actionID>");
 * ```
 */
export const iotActionList: XmlParam<"IOTActionList", IotActionList> = xmlParam(
  "IOTActionList",
  {
    item: repeated(obj({
      actionID: int(),
      channelBits: u64(),
      deviceType: int(),
      name: text(),
      uid: text(),
      content: text(),
      alarmType: text(),
      timeTable: text(),
    })),
  },
);
