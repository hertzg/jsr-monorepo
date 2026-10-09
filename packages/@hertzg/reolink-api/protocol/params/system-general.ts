/**
 * `<SystemGeneral>`: the clock, time zone, OSD date format, language, device
 * name and login lockout. Read with cmd 104 (`GET_SYSGENERAL_CFG_V20`) and
 * written with cmd 105 (`SET_SYSGENERAL_CFG_V20`), next to `<Norm>`.
 *
 * Firmware: `net_sys_general_cfg_s2x` writes every field always.
 * `nets_sys_general_x2s` reads whichever is present, except `isDst`, which it
 * never reads. It rejects a month outside 1 to 12, a day outside 1 to 31, an
 * hour above 23 and a minute or second above 59.
 *
 * @example Read a cmd 104 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { systemGeneral } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<SystemGeneral version="1.1"><timeZone>-14400</timeZone><osdFormat>YMD</osdFormat>' +
 *     "<year>2026</year><month>10</month><day>9</day><hour>12</hour><minute>0</minute>" +
 *     "<second>0</second><deviceId>0</deviceId><timeFormat>0</timeFormat>" +
 *     "<language>English</language><deviceName>Front door</deviceName>" +
 *     "<loginLock>1</loginLock><lockTime>300</lockTime><allowedTimes>5</allowedTimes>" +
 *     "<isDst>0</isDst></SystemGeneral>",
 * ).root;
 *
 * assertEquals(systemGeneral.decode(root).deviceName, "Front door");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The general system settings in `<SystemGeneral>`. */
export type SystemGeneral = {
  /** Time zone offset. */
  timeZone?: number;
  /** Date order shown in the OSD. */
  osdFormat?: "MDY" | "YMD" | "DMY" | "MDY_CN" | "YMD_CN" | "DMY_CN";
  /** Year. */
  year?: number;
  /** Month, 1 to 12. */
  month?: number;
  /** Day of the month, 1 to 31. */
  day?: number;
  /** Hour, 0 to 23. */
  hour?: number;
  /** Minute, 0 to 59. */
  minute?: number;
  /** Second, 0 to 59. */
  second?: number;
  /** Device id. */
  deviceId?: number;
  /** Clock format index. */
  timeFormat?: number;
  /** UI language name, such as `English`. */
  language?: string;
  /** Device name, up to 31 characters. */
  deviceName?: string;
  /** 1 when repeated failed logins lock the account. */
  loginLock?: number;
  /** How long a locked account stays locked. */
  lockTime?: number;
  /** Failed logins allowed before the lock. */
  allowedTimes?: number;
  /** Whether daylight saving time is in effect; reply only. */
  isDst?: number;
};

/**
 * Codec for `<SystemGeneral>`.
 *
 * @example Rename the device
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { systemGeneral } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   systemGeneral.encode({ deviceName: "Back yard" }),
 *   '<SystemGeneral version="1.1"><deviceName>Back yard</deviceName></SystemGeneral>',
 * );
 * ```
 */
export const systemGeneral: XmlParam<"SystemGeneral", SystemGeneral> = xmlParam(
  "SystemGeneral",
  {
    timeZone: optional(int()),
    osdFormat: optional(
      oneOf("MDY", "YMD", "DMY", "MDY_CN", "YMD_CN", "DMY_CN"),
    ),
    year: optional(int()),
    month: optional(int()),
    day: optional(int()),
    hour: optional(int()),
    minute: optional(int()),
    second: optional(int()),
    deviceId: optional(int()),
    timeFormat: optional(int()),
    language: optional(text()),
    deviceName: optional(text()),
    loginLock: optional(int()),
    lockTime: optional(int()),
    allowedTimes: optional(int()),
    isDst: optional(int()),
  },
);
