/**
 * `<ExposureCfg>`: the exposure mode, the reply to cmd 156.
 *
 * Firmware: `nets_exposure_s2x` writes `exposureType`, always. The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 156 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { exposureCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ExposureCfg version="1.1"><exposureType>auto</exposureType></ExposureCfg>',
 * ).root;
 *
 * assertEquals(exposureCfg.decode(root).exposureType, "auto");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The exposure setting in `<ExposureCfg>`. */
export type ExposureCfg = {
  /**
   * Exposure mode. `gainFist` is the firmware's own spelling of gain
   * priority.
   */
  exposureType: "auto" | "shutterFirst" | "gainFist" | "manual";
};

/**
 * Codec for `<ExposureCfg>`.
 *
 * @example Build an `<ExposureCfg>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { exposureCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = exposureCfg.encode({ exposureType: "shutterFirst" });
 *
 * assertStringIncludes(xml, "<exposureType>shutterFirst</exposureType>");
 * ```
 */
export const exposureCfg: XmlParam<"ExposureCfg", ExposureCfg> = xmlParam(
  "ExposureCfg",
  {
    exposureType: oneOf("auto", "shutterFirst", "gainFist", "manual"),
  },
);
