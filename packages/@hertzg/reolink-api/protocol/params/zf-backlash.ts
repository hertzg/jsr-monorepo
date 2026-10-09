/**
 * `<ZfBacklash>`: the zoom and focus motor backlash. An element that no
 * registered command carries.
 *
 * Firmware: `nets_param_zf_backlash_s2x` writes both fields, always, focus
 * first. `nets_param_zf_backlash_x2s` reads each field when present and
 * skips a missing one, so both fields are optional here.
 *
 * @example Read a `<ZfBacklash>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { zfBacklash } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ZfBacklash version="1.1"><fBacklash>12</fBacklash>' +
 *     "<zBacklash>30</zBacklash></ZfBacklash>",
 * ).root;
 *
 * assertEquals(zfBacklash.decode(root), { fBacklash: 12, zBacklash: 30 });
 * ```
 *
 * @module
 */

import { optional, uint, type XmlParam, xmlParam } from "../xml.ts";

/** The zoom and focus motor backlash in `<ZfBacklash>`. */
export type ZfBacklash = {
  /** Focus motor backlash. */
  fBacklash?: number;
  /** Zoom motor backlash. */
  zBacklash?: number;
};

/**
 * Codec for `<ZfBacklash>`.
 *
 * @example Build a `<ZfBacklash>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { zfBacklash } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   zfBacklash.encode({ fBacklash: 12, zBacklash: 30 }),
 *   '<ZfBacklash version="1.1"><fBacklash>12</fBacklash>' +
 *     "<zBacklash>30</zBacklash></ZfBacklash>",
 * );
 * ```
 */
export const zfBacklash: XmlParam<"ZfBacklash", ZfBacklash> = xmlParam(
  "ZfBacklash",
  {
    fBacklash: optional(uint()),
    zBacklash: optional(uint()),
  },
);
