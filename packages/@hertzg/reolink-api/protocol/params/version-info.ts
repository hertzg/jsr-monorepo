/**
 * `<VersionInfo>`: the device model, serial number and firmware build, as
 * cmd 80 (`GET_VERSION_V20`) replies.
 *
 * Firmware: the cmd 80 handler in `netserver` writes every field from `name`
 * to `pakSuffix` always. It adds `anotherPakSuffix` only when that string is
 * not empty, and `helpVersion` only when the device has one. There is no
 * parser: the camera never reads this element.
 *
 * @example Read a cmd 80 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { versionInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<VersionInfo version="1.1"><name>Front door</name><type>IPC</type>' +
 *     "<serialNumber>00000000000000</serialNumber><buildDay>build 23110119</buildDay>" +
 *     "<hardwareVersion>IPC_523SD10</hardwareVersion><cfgVersion>v3.1.0.0</cfgVersion>" +
 *     "<firmwareVersion>v3.1.0.2898_23110119</firmwareVersion><detail>IPC_523SD10</detail>" +
 *     "<IEClient>IE</IEClient><pakSuffix>pak</pakSuffix></VersionInfo>",
 * ).root;
 *
 * assertEquals(versionInfo.decode(root).firmwareVersion, "v3.1.0.2898_23110119");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The device and firmware identity in `<VersionInfo>`. */
export type VersionInfo = {
  /** Device name. */
  name: string;
  /** Device type. */
  type: string;
  /** Serial number. */
  serialNumber: string;
  /** Firmware build date. */
  buildDay: string;
  /** Hardware version. */
  hardwareVersion: string;
  /** Configuration version. */
  cfgVersion: string;
  /** Firmware version. */
  firmwareVersion: string;
  /** Detailed build string. */
  detail: string;
  /** Web client identifier. */
  IEClient: string;
  /** Upgrade package file suffix. */
  pakSuffix: string;
  /** Product item number. Video Doorbell PoE only. */
  itemNo?: string;
  /** AI model version. Video Doorbell PoE only. */
  aiVersion?: string;
  /** A second accepted upgrade package suffix; written only when set. */
  anotherPakSuffix?: string;
  /** Help document version; written only when the device has one. */
  helpVersion?: string;
};

/**
 * Codec for `<VersionInfo>`.
 *
 * @example Round-trip a reply with the optional suffix
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { versionInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const value = {
 *   name: "Garage",
 *   type: "IPC",
 *   serialNumber: "serial-garage",
 *   buildDay: "build 24010101",
 *   hardwareVersion: "hw-garage",
 *   cfgVersion: "cfg-garage",
 *   firmwareVersion: "fw-garage",
 *   detail: "detail-garage",
 *   IEClient: "ie-garage",
 *   pakSuffix: "pak",
 *   anotherPakSuffix: "paks",
 * };
 *
 * assertEquals(versionInfo.decode(parse(versionInfo.encode(value)).root), value);
 * ```
 */
export const versionInfo: XmlParam<"VersionInfo", VersionInfo> = xmlParam(
  "VersionInfo",
  {
    name: text(),
    type: text(),
    serialNumber: text(),
    buildDay: text(),
    hardwareVersion: text(),
    cfgVersion: text(),
    firmwareVersion: text(),
    detail: text(),
    IEClient: text(),
    pakSuffix: text(),
    itemNo: optional(text()),
    aiVersion: optional(text()),
    anotherPakSuffix: optional(text()),
    helpVersion: optional(text()),
  },
);
