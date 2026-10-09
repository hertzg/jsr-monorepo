/**
 * `<BatteryRemainList>`: a table of battery levels, read with cmd 259.
 *
 * Firmware: `net_bat_remain_s2x` writes every field, always.
 * `net_bat_remain_x2s` reads nothing, so the element only appears in
 * replies and both fields are required.
 *
 * @example Read a cmd 259 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { batteryRemainList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BatteryRemainList version="1.1"><channelId>0</channelId>' +
 *     "<batteryTable>100,98,97,95</batteryTable></BatteryRemainList>",
 * ).root;
 *
 * assertEquals(batteryRemainList.decode(root).batteryTable, "100,98,97,95");
 * ```
 *
 * @module
 */

import { int, text, type XmlParam, xmlParam } from "../xml.ts";

/** The battery level table in `<BatteryRemainList>`. */
export type BatteryRemainList = {
  /** Zero-based channel. */
  channelId: number;
  /**
   * Up to 30 integers joined with `,`. The firmware drops trailing `-1`
   * entries, so an empty table is an empty string.
   */
  batteryTable: string;
};

/**
 * Codec for `<BatteryRemainList>`.
 *
 * @example Build a `<BatteryRemainList>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { batteryRemainList } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   batteryRemainList.encode({ channelId: 0, batteryTable: "88,87" }),
 *   '<BatteryRemainList version="1.1"><channelId>0</channelId>' +
 *     "<batteryTable>88,87</batteryTable></BatteryRemainList>",
 * );
 * ```
 */
export const batteryRemainList: XmlParam<
  "BatteryRemainList",
  BatteryRemainList
> = xmlParam("BatteryRemainList", {
  channelId: int(),
  batteryTable: text(),
});
