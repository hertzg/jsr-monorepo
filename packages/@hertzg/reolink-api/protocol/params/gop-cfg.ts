/**
 * `<GopCfg>`: the GOP (keyframe interval) for one stream. Written with
 * cmd 284.
 *
 * Firmware: `nets_param_gop_cfg_x2s` reads `channel`, `streamType` and
 * `gopTime`, skipping any that are missing, and rejects a negative
 * `gopTime`. No serializer exists, so the field order follows the
 * firmware's struct layout. Every field is optional.
 *
 * @example Read a `<GopCfg>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { gopCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<GopCfg version="1.1"><channel>0</channel><streamType>0</streamType>' +
 *     "<gopTime>2</gopTime></GopCfg>",
 * ).root;
 *
 * assertEquals(gopCfg.decode(root).gopTime, 2);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The GOP setting in `<GopCfg>`. */
export type GopCfg = {
  /** Zero-based channel. */
  channel?: number;
  /** Stream as a number. */
  streamType?: number;
  /** GOP length; the firmware rejects a negative value. */
  gopTime?: number;
};

/**
 * Codec for `<GopCfg>`.
 *
 * @example Set the main stream GOP
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { gopCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   gopCfg.encode({ channel: 0, streamType: 0, gopTime: 4 }),
 *   '<GopCfg version="1.1"><channel>0</channel><streamType>0</streamType>' +
 *     "<gopTime>4</gopTime></GopCfg>",
 * );
 * ```
 */
export const gopCfg: XmlParam<"GopCfg", GopCfg> = xmlParam("GopCfg", {
  channel: optional(int()),
  streamType: optional(int()),
  gopTime: optional(int()),
});
