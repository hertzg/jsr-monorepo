/**
 * `<PowerLineFrequency>`: the anti-flicker mode, the reply to cmd 154.
 *
 * Firmware: `nets_power_line_frequency_s2x` writes `mode` and `enable`,
 * always; anti-flicker off is written as `50hz` with `enable` 0. The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and none of these fields, so this shape
 * is reply-only.
 *
 * @example Read the cmd 154 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { powerLineFrequency } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PowerLineFrequency version="1.1"><mode>60hz</mode><enable>1</enable>' +
 *     "</PowerLineFrequency>",
 * ).root;
 *
 * assertEquals(powerLineFrequency.decode(root).mode, "60hz");
 * ```
 *
 * @module
 */

import { int, oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The anti-flicker setting in `<PowerLineFrequency>`. */
export type PowerLineFrequency = {
  /** Mains frequency to match, or `outdoor` for none. */
  mode: "outdoor" | "50hz" | "60hz";
  /** 0 when anti-flicker is off. */
  enable: number;
};

/**
 * Codec for `<PowerLineFrequency>`.
 *
 * @example Build a `<PowerLineFrequency>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { powerLineFrequency } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = powerLineFrequency.encode({ mode: "outdoor", enable: 1 });
 *
 * assertStringIncludes(xml, "<mode>outdoor</mode>");
 * ```
 */
export const powerLineFrequency: XmlParam<
  "PowerLineFrequency",
  PowerLineFrequency
> = xmlParam("PowerLineFrequency", {
  mode: oneOf("outdoor", "50hz", "60hz"),
  enable: int(),
});
