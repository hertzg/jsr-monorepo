/**
 * `<dingdongCtrl>`: starts, stops or resets chime (dingdong) pairing. Sent
 * with cmd 483.
 *
 * Firmware (Video Doorbell PoE): `net_dingdong_ctrl_x2s` reads `opt` when
 * present, up to 15 bytes, and maps `enter`, `exit` and `reset` to 0, 1 and
 * 2. It rejects any other value. No serializer exists, so the camera never
 * writes this element.
 *
 * @example Build a cmd 483 request that starts pairing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dingdongCtrl } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   dingdongCtrl.encode({ opt: "enter" }),
 *   '<dingdongCtrl version="1.1"><opt>enter</opt></dingdongCtrl>',
 * );
 * ```
 *
 * @module
 */

import { oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The chime pairing control in `<dingdongCtrl>`. */
export type DingdongCtrl = {
  /** Enter pairing, exit pairing, or reset. */
  opt?: "enter" | "exit" | "reset";
};

/**
 * Codec for `<dingdongCtrl>`.
 *
 * @example Read a `<dingdongCtrl>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dingdongCtrl } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse("<dingdongCtrl><opt>exit</opt></dingdongCtrl>").root;
 *
 * assertEquals(dingdongCtrl.decode(root), { opt: "exit" });
 * ```
 */
export const dingdongCtrl: XmlParam<"dingdongCtrl", DingdongCtrl> = xmlParam(
  "dingdongCtrl",
  { opt: optional(oneOf("enter", "exit", "reset")) },
);
