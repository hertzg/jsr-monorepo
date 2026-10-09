/**
 * `<OnlineNewFirmwareInfo>`: whether a newer firmware is available online.
 * Sent in the reply to cmd 197.
 *
 * Firmware: `net_online_update_ver_chk_s2x` always writes `hasNewFirmware`.
 *
 * @example Read the cmd 197 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { onlineNewFirmwareInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<OnlineNewFirmwareInfo version="1.1"><hasNewFirmware>1</hasNewFirmware>' +
 *     "</OnlineNewFirmwareInfo>",
 * ).root;
 *
 * assertEquals(onlineNewFirmwareInfo.decode(root).hasNewFirmware, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The online firmware check result in `<OnlineNewFirmwareInfo>`. */
export type OnlineNewFirmwareInfo = {
  /** 1 when a newer firmware is available, 0 otherwise. */
  hasNewFirmware: number;
};

/**
 * Codec for `<OnlineNewFirmwareInfo>`.
 *
 * @example Build an `<OnlineNewFirmwareInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { onlineNewFirmwareInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   onlineNewFirmwareInfo.encode({ hasNewFirmware: 0 }),
 *   '<OnlineNewFirmwareInfo version="1.1"><hasNewFirmware>0</hasNewFirmware>' +
 *     "</OnlineNewFirmwareInfo>",
 * );
 * ```
 */
export const onlineNewFirmwareInfo: XmlParam<
  "OnlineNewFirmwareInfo",
  OnlineNewFirmwareInfo
> = xmlParam("OnlineNewFirmwareInfo", {
  hasNewFirmware: int(),
});
