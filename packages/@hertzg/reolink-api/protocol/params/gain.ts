/**
 * `<Gain>`: the sensor gain level, the reply to cmd 160.
 *
 * Firmware: `nets_gain_s2x` writes `gainLevel`, always. The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 160 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { gain } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Gain version="1.1"><gainLevel>40</gainLevel></Gain>')
 *   .root;
 *
 * assertEquals(gain.decode(root).gainLevel, 40);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The gain setting in `<Gain>`. */
export type Gain = {
  /** Gain level; the `<InputAdvanceCfg>` parser accepts 0 to 100. */
  gainLevel: number;
};

/**
 * Codec for `<Gain>`.
 *
 * @example Build a `<Gain>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gain } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   gain.encode({ gainLevel: 75 }),
 *   '<Gain version="1.1"><gainLevel>75</gainLevel></Gain>',
 * );
 * ```
 */
export const gain: XmlParam<"Gain", Gain> = xmlParam("Gain", {
  gainLevel: int(),
});
