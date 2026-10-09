/**
 * `<Norm>`: the analog video standard. Read with cmd 104
 * (`GET_SYSGENERAL_CFG_V20`) and written with cmd 105
 * (`SET_SYSGENERAL_CFG_V20`), next to `<SystemGeneral>`.
 *
 * Firmware: `net_sys_videoform_cfg_s2x` writes `norm` always, as `NTSC` for
 * index 1 and `PAL` otherwise. `nets_sys_videoform_x2s` fails without it and
 * accepts only those two values, ignoring case.
 *
 * @example Read a cmd 104 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { norm } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Norm version="1.1"><norm>PAL</norm></Norm>').root;
 *
 * assertEquals(norm.decode(root).norm, "PAL");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The video standard in `<Norm>`. */
export type Norm = {
  /** The video standard. */
  norm: "PAL" | "NTSC";
};

/**
 * Codec for `<Norm>`.
 *
 * @example Build a `<Norm>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { norm } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   norm.encode({ norm: "NTSC" }),
 *   '<Norm version="1.1"><norm>NTSC</norm></Norm>',
 * );
 * ```
 */
export const norm: XmlParam<"Norm", Norm> = xmlParam("Norm", {
  norm: oneOf("PAL", "NTSC"),
});
