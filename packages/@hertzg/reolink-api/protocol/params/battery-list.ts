/**
 * `<BatteryList>`: the battery state. The camera pushes it unasked as
 * cmd 252.
 *
 * Firmware: `nets_battery_status_report` writes one `<BatteryInfo>` with
 * every field, always. It writes `channelId` as 0 and gives up without
 * pushing when the charge or adapter state is outside the known values.
 * No firmware code reads this element.
 *
 * @example Read the cmd 252 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { batteryList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BatteryList version="1.1"><BatteryInfo><channelId>0</channelId>' +
 *     "<chargeStatus>charging</chargeStatus><adapterStatus>solarPanel</adapterStatus>" +
 *     "<voltage>4012</voltage><current>350</current><temperature>27</temperature>" +
 *     "<batteryPercent>81</batteryPercent><lowPower>0</lowPower>" +
 *     "<batteryVersion>2</batteryVersion></BatteryInfo></BatteryList>",
 * ).root;
 *
 * assertEquals(batteryList.decode(root).BatteryInfo.batteryPercent, 81);
 * ```
 *
 * @module
 */

import { int, obj, oneOf, uint, type XmlParam, xmlParam } from "../xml.ts";

/** The battery state in `<BatteryList>`. */
export type BatteryList = {
  /** The one battery the camera reports. */
  BatteryInfo: {
    /** Zero-based channel; the push always writes 0. */
    channelId: number;
    /** Charging state. */
    chargeStatus: "none" | "charging" | "chargeComplete";
    /** What the battery charges from. */
    adapterStatus: "none" | "adapter" | "solarPanel";
    /** Battery voltage, unsigned. */
    voltage: number;
    /** Battery current, signed. */
    current: number;
    /** Battery temperature, signed. */
    temperature: number;
    /** Charge level in percent. */
    batteryPercent: number;
    /** Low battery flag. */
    lowPower: number;
    /** Battery type, from `sc_get_battery_type`. */
    batteryVersion: number;
  };
};

/**
 * Codec for `<BatteryList>`.
 *
 * @example Build a `<BatteryList>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { batteryList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = batteryList.encode({
 *   BatteryInfo: {
 *     channelId: 0,
 *     chargeStatus: "chargeComplete",
 *     adapterStatus: "adapter",
 *     voltage: 4200,
 *     current: 0,
 *     temperature: 25,
 *     batteryPercent: 100,
 *     lowPower: 0,
 *     batteryVersion: 1,
 *   },
 * });
 *
 * assertStringIncludes(xml, "<chargeStatus>chargeComplete</chargeStatus>");
 * ```
 */
export const batteryList: XmlParam<"BatteryList", BatteryList> = xmlParam(
  "BatteryList",
  {
    BatteryInfo: obj({
      channelId: int(),
      chargeStatus: oneOf("none", "charging", "chargeComplete"),
      adapterStatus: oneOf("none", "adapter", "solarPanel"),
      voltage: uint(),
      current: int(),
      temperature: int(),
      batteryPercent: uint(),
      lowPower: uint(),
      batteryVersion: int(),
    }),
  },
);
