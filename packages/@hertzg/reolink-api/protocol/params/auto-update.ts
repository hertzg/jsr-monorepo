/**
 * `<AutoUpdate>`: whether the camera updates its firmware on its own. Read
 * with cmd 195, written with cmd 196.
 *
 * Firmware: `net_online_update_cfg_s2x` always writes `enable`.
 * `net_online_update_cfg_x2s` reads it when present, and rejects a value
 * other than 0 or 1.
 *
 * @example Read the cmd 195 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { autoUpdate } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AutoUpdate version="1.1"><enable>1</enable></AutoUpdate>',
 * ).root;
 *
 * assertEquals(autoUpdate.decode(root).enable, 1);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The automatic update setting in `<AutoUpdate>`. */
export type AutoUpdate = {
  /** 1 to update automatically, 0 not to; the reply always carries it. */
  enable?: number;
};

/**
 * Codec for `<AutoUpdate>`.
 *
 * @example Build a cmd 196 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { autoUpdate } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   autoUpdate.encode({ enable: 0 }),
 *   '<AutoUpdate version="1.1"><enable>0</enable></AutoUpdate>',
 * );
 * ```
 */
export const autoUpdate: XmlParam<"AutoUpdate", AutoUpdate> = xmlParam(
  "AutoUpdate",
  {
    enable: optional(int()),
  },
);
