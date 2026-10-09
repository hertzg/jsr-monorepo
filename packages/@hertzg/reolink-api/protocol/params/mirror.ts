/**
 * `<Mirror>`: horizontal image mirroring, the reply to cmd 170.
 *
 * Firmware: `nets_mirror_s2x` writes `status`, always. The name is
 * registered with the shared `nets_isp_advance_common_x2s` parser, which
 * reads `<InputAdvanceCfg>` children and not this field, so this shape is
 * reply-only.
 *
 * @example Read the cmd 170 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { mirror } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Mirror version="1.1"><status>1</status></Mirror>').root;
 *
 * assertEquals(mirror.decode(root).status, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The mirroring setting in `<Mirror>`. */
export type Mirror = {
  /** 1 when the image is mirrored. */
  status: number;
};

/**
 * Codec for `<Mirror>`.
 *
 * @example Build a `<Mirror>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { mirror } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   mirror.encode({ status: 0 }),
 *   '<Mirror version="1.1"><status>0</status></Mirror>',
 * );
 * ```
 */
export const mirror: XmlParam<"Mirror", Mirror> = xmlParam("Mirror", {
  status: int(),
});
