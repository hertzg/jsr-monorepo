/**
 * `<rfAlarmCfg>`: the PIR (passive infrared) motion sensor alarm. Read with
 * cmd 212, written with cmd 213.
 *
 * Firmware: `net_rf_s2x` always writes `enable`, `sensiValue` and
 * `reduceFalseAlarm`. `net_rf_x2s` reads each when present and skips the
 * rest; it rejects an `enable` other than 0 or 1 and a `sensiValue` above
 * 100.
 *
 * @example Read the cmd 212 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { rfAlarmCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<rfAlarmCfg version="1.1"><enable>1</enable><sensiValue>60</sensiValue>' +
 *     "<reduceFalseAlarm>0</reduceFalseAlarm></rfAlarmCfg>",
 * ).root;
 *
 * assertEquals(rfAlarmCfg.decode(root).sensiValue, 60);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The PIR alarm settings in `<rfAlarmCfg>`. */
export type RfAlarmCfg = {
  /** 1 for on, 0 for off. */
  enable?: number;
  /** Sensitivity, 0 to 100. */
  sensiValue?: number;
  /** False alarm reduction as a number. */
  reduceFalseAlarm?: number;
};

/**
 * Codec for `<rfAlarmCfg>`.
 *
 * @example Build a cmd 213 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rfAlarmCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   rfAlarmCfg.encode({ enable: 1, sensiValue: 80 }),
 *   '<rfAlarmCfg version="1.1"><enable>1</enable><sensiValue>80</sensiValue>' +
 *     "</rfAlarmCfg>",
 * );
 * ```
 */
export const rfAlarmCfg: XmlParam<"rfAlarmCfg", RfAlarmCfg> = xmlParam(
  "rfAlarmCfg",
  {
    enable: optional(int()),
    sensiValue: optional(int()),
    reduceFalseAlarm: optional(int()),
  },
);
