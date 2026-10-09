/**
 * `<DayNightMode>`: colour or black-and-white image switching, the reply to
 * cmd 164.
 *
 * Firmware: `nets_day_night_mode_s2x` writes `mode`, always. The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 164 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dayNightMode } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<DayNightMode version="1.1"><mode>auto</mode></DayNightMode>')
 *   .root;
 *
 * assertEquals(dayNightMode.decode(root).mode, "auto");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The day/night setting in `<DayNightMode>`. */
export type DayNightMode = {
  /** Switch automatically, or hold colour or black and white. */
  mode: "auto" | "color" | "blackAndWhite";
};

/**
 * Codec for `<DayNightMode>`.
 *
 * @example Build a `<DayNightMode>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { dayNightMode } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = dayNightMode.encode({ mode: "blackAndWhite" });
 *
 * assertStringIncludes(xml, "<mode>blackAndWhite</mode>");
 * ```
 */
export const dayNightMode: XmlParam<"DayNightMode", DayNightMode> = xmlParam(
  "DayNightMode",
  {
    mode: oneOf("auto", "color", "blackAndWhite"),
  },
);
