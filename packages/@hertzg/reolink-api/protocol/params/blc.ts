/**
 * `<BLC>`: backlight compensation, the reply to cmd 168.
 *
 * Firmware: `nets_blc_s2x` writes `enable`, `BLCMode` and `level`, always;
 * `level` is the backlight level in `backLight` mode and the dynamic range
 * level in `dynamicRange` mode. With compensation off it writes `enable` 0
 * and `BLCMode` `backLight`. The name is registered with the shared
 * `nets_isp_advance_common_x2s` parser, which reads `<InputAdvanceCfg>`
 * children and none of these fields, so this shape is reply-only.
 *
 * @example Read the cmd 168 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { blc } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BLC version="1.1"><enable>1</enable><BLCMode>dynamicRange</BLCMode>' +
 *     "<level>128</level></BLC>",
 * ).root;
 *
 * assertEquals(blc.decode(root).BLCMode, "dynamicRange");
 * ```
 *
 * @module
 */

import { int, oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The backlight compensation setting in `<BLC>`. */
export type Blc = {
  /** 0 when compensation is off. */
  enable: number;
  /** Compensation method. */
  BLCMode: "backLight" | "dynamicRange";
  /** Strength of the selected method. */
  level: number;
};

/**
 * Codec for `<BLC>`.
 *
 * @example Build a `<BLC>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { blc } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = blc.encode({ enable: 1, BLCMode: "backLight", level: 64 });
 *
 * assertStringIncludes(xml, "<BLCMode>backLight</BLCMode>");
 * ```
 */
export const blc: XmlParam<"BLC", Blc> = xmlParam("BLC", {
  enable: int(),
  BLCMode: oneOf("backLight", "dynamicRange"),
  level: int(),
});
