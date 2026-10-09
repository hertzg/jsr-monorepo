/**
 * `<TimeCfg>`: sets the camera clock. Written with cmd 287.
 *
 * Firmware: `nets_param_time_cfg_x2s` reads `realTime` as an unsigned
 * long. When it is missing the camera uses its own current time, so it is
 * optional. No serializer exists.
 *
 * @example Read a `<TimeCfg>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timeCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<TimeCfg version="1.1"><realTime>1791504000</realTime></TimeCfg>',
 * ).root;
 *
 * assertEquals(timeCfg.decode(root).realTime, 1791504000);
 * ```
 *
 * @module
 */

import { optional, uint, type XmlParam, xmlParam } from "../xml.ts";

/** The clock setting in `<TimeCfg>`. */
export type TimeCfg = {
  /** The time to set, as Unix seconds. */
  realTime?: number;
};

/**
 * Codec for `<TimeCfg>`.
 *
 * @example Set the camera clock
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { timeCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   timeCfg.encode({ realTime: 1791504000 }),
 *   '<TimeCfg version="1.1"><realTime>1791504000</realTime></TimeCfg>',
 * );
 * ```
 */
export const timeCfg: XmlParam<"TimeCfg", TimeCfg> = xmlParam("TimeCfg", {
  realTime: optional(uint()),
});
