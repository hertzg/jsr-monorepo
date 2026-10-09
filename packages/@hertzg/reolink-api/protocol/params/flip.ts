/**
 * `<Flip>`: vertical image flipping, the reply to cmd 172.
 *
 * Firmware: `nets_flip_s2x` writes `status`, always. The name is registered
 * with the shared `nets_isp_advance_common_x2s` parser, which reads
 * `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 172 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { flip } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Flip version="1.1"><status>0</status></Flip>').root;
 *
 * assertEquals(flip.decode(root).status, 0);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The flipping setting in `<Flip>`. */
export type Flip = {
  /** 1 when the image is flipped. */
  status: number;
};

/**
 * Codec for `<Flip>`.
 *
 * @example Build a `<Flip>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { flip } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   flip.encode({ status: 1 }),
 *   '<Flip version="1.1"><status>1</status></Flip>',
 * );
 * ```
 */
export const flip: XmlParam<"Flip", Flip> = xmlParam("Flip", {
  status: int(),
});
