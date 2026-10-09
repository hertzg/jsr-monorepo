/**
 * `<OnlineUpdate>`: starts or declines an online firmware update. Sent with
 * cmd 191.
 *
 * Firmware: `net_online_update_x2s` reads `needUpdate` when present and
 * skips anything else. No serializer exists, so the camera never writes
 * this element.
 *
 * @example Build a cmd 191 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { onlineUpdate } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   onlineUpdate.encode({ needUpdate: 1 }),
 *   '<OnlineUpdate version="1.1"><needUpdate>1</needUpdate></OnlineUpdate>',
 * );
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The online update request in `<OnlineUpdate>`. */
export type OnlineUpdate = {
  /** Whether to update, as a number. */
  needUpdate?: number;
};

/**
 * Codec for `<OnlineUpdate>`.
 *
 * @example Read an `<OnlineUpdate>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { onlineUpdate } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<OnlineUpdate version="1.1"><needUpdate>0</needUpdate></OnlineUpdate>',
 * ).root;
 *
 * assertEquals(onlineUpdate.decode(root), { needUpdate: 0 });
 * ```
 */
export const onlineUpdate: XmlParam<"OnlineUpdate", OnlineUpdate> = xmlParam(
  "OnlineUpdate",
  {
    needUpdate: optional(int()),
  },
);
