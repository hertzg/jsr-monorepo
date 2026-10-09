/**
 * `<ChargeBatteryInfo>`: the battery state, asked for with cmd 253.
 *
 * The reply element is named `<BatteryInfo>`, not `<ChargeBatteryInfo>`:
 * `net_bat_info_s2x` builds `<BatteryInfo version="1.1">` while the
 * parameter is registered, and read, as `ChargeBatteryInfo`. Pass the
 * reply's `<BatteryInfo>` element to `decode`.
 *
 * Firmware: `net_bat_info_s2x` writes every field, always, and fails when
 * the charge or adapter state is outside the known values.
 * `net_bat_info_x2s` reads whichever fields are present, except
 * `batteryVersion`, so every field is optional.
 *
 * @example Read a cmd 253 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { chargeBatteryInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BatteryInfo version="1.1"><channelId>0</channelId>' +
 *     "<chargeStatus>none</chargeStatus><adapterStatus>none</adapterStatus>" +
 *     "<voltage>3850</voltage><current>-90</current><temperature>22</temperature>" +
 *     "<batteryPercent>57</batteryPercent><lowPower>0</lowPower>" +
 *     "<batteryVersion>1</batteryVersion></BatteryInfo>",
 * ).root;
 *
 * assertEquals(chargeBatteryInfo.decode(root).batteryPercent, 57);
 * ```
 *
 * @module
 */

import { int, oneOf, optional, uint, type XmlParam, xmlParam } from "../xml.ts";

/** The battery state in the cmd 253 `<BatteryInfo>` reply. */
export type ChargeBatteryInfo = {
  /** Zero-based channel. */
  channelId?: number;
  /** Charging state. */
  chargeStatus?: "none" | "charging" | "chargeComplete";
  /** What the battery charges from. */
  adapterStatus?: "none" | "adapter" | "solarPanel";
  /** Battery voltage, unsigned. */
  voltage?: number;
  /** Battery current, signed. */
  current?: number;
  /** Battery temperature, signed. */
  temperature?: number;
  /** Charge level in percent. */
  batteryPercent?: number;
  /** Low battery flag. */
  lowPower?: number;
  /** Battery type; written only. */
  batteryVersion?: number;
};

/**
 * Codec for `<ChargeBatteryInfo>`.
 *
 * @example Build a `<ChargeBatteryInfo>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { chargeBatteryInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   chargeBatteryInfo.encode({ channelId: 0 }),
 *   '<ChargeBatteryInfo version="1.1"><channelId>0</channelId></ChargeBatteryInfo>',
 * );
 * ```
 */
export const chargeBatteryInfo: XmlParam<
  "ChargeBatteryInfo",
  ChargeBatteryInfo
> = xmlParam("ChargeBatteryInfo", {
  channelId: optional(int()),
  chargeStatus: optional(oneOf("none", "charging", "chargeComplete")),
  adapterStatus: optional(oneOf("none", "adapter", "solarPanel")),
  voltage: optional(uint()),
  current: optional(int()),
  temperature: optional(int()),
  batteryPercent: optional(uint()),
  lowPower: optional(uint()),
  batteryVersion: optional(int()),
});
