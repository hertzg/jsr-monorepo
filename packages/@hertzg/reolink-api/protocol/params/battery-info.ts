/**
 * `<BatteryInfo>`: the battery state in the cmd 253 reply. The request
 * names `<ChargeBatteryInfo>`, but the reply carries this element instead.
 *
 * Firmware: `net_bat_info_s2x` writes every field, always. It fails the
 * whole reply instead of writing an unknown charge or adapter state.
 *
 * @example Read the cmd 253 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { batteryInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BatteryInfo version="1.1"><channelId>0</channelId>' +
 *     "<chargeStatus>charging</chargeStatus><adapterStatus>solarPanel</adapterStatus>" +
 *     "<voltage>8120</voltage><current>-35</current><temperature>27</temperature>" +
 *     "<batteryPercent>86</batteryPercent><lowPower>0</lowPower>" +
 *     "<batteryVersion>2</batteryVersion></BatteryInfo>",
 * ).root;
 *
 * assertEquals(batteryInfo.decode(root).batteryPercent, 86);
 * ```
 *
 * @module
 */

import { int, oneOf, uint, type XmlParam, xmlParam } from "../xml.ts";

/** The battery state in `<BatteryInfo>`. */
export type BatteryInfo = {
  /** Zero-based channel. */
  channelId: number;
  /** Charging state. */
  chargeStatus: "none" | "charging" | "chargeComplete";
  /** What the battery charges from. */
  adapterStatus: "none" | "adapter" | "solarPanel";
  /** Battery voltage, unsigned; the unit is not established. */
  voltage: number;
  /** Battery current, signed; the unit is not established. */
  current: number;
  /** Battery temperature, signed; the unit is not established. */
  temperature: number;
  /** Charge level in percent. */
  batteryPercent: number;
  /** Low battery flag. */
  lowPower: number;
  /** Battery type as a number; the firmware does not name the values. */
  batteryVersion: number;
};

/**
 * Codec for `<BatteryInfo>`.
 *
 * @example Build a `<BatteryInfo>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { batteryInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = batteryInfo.encode({
 *   channelId: 0,
 *   chargeStatus: "chargeComplete",
 *   adapterStatus: "adapter",
 *   voltage: 8400,
 *   current: 0,
 *   temperature: 31,
 *   batteryPercent: 100,
 *   lowPower: 0,
 *   batteryVersion: 1,
 * });
 *
 * assertStringIncludes(xml, "<chargeStatus>chargeComplete</chargeStatus>");
 * ```
 */
export const batteryInfo: XmlParam<"BatteryInfo", BatteryInfo> = xmlParam(
  "BatteryInfo",
  {
    channelId: int(),
    chargeStatus: oneOf("none", "charging", "chargeComplete"),
    adapterStatus: oneOf("none", "adapter", "solarPanel"),
    voltage: uint(),
    current: int(),
    temperature: int(),
    batteryPercent: uint(),
    lowPower: uint(),
    batteryVersion: int(),
  },
);
