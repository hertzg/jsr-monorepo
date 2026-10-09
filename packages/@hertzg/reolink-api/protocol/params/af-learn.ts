/**
 * `<AfLearn>`: starts autofocus learning on a channel. A factory command
 * that no registered command carries.
 *
 * Firmware: `nets_param_af_learning_x2s` reads `channelId` when present and
 * rejects a value above 63. No serializer exists, so the camera never writes
 * this element.
 *
 * @example Build an `<AfLearn>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { afLearn } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   afLearn.encode({ channelId: 0 }),
 *   '<AfLearn version="1.1"><channelId>0</channelId></AfLearn>',
 * );
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The autofocus learning request in `<AfLearn>`. */
export type AfLearn = {
  /** Zero-based channel, 0 to 63; the firmware skips it when missing. */
  channelId?: number;
};

/**
 * Codec for `<AfLearn>`.
 *
 * @example Read an `<AfLearn>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { afLearn } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AfLearn version="1.1"><channelId>2</channelId></AfLearn>',
 * ).root;
 *
 * assertEquals(afLearn.decode(root), { channelId: 2 });
 * ```
 */
export const afLearn: XmlParam<"AfLearn", AfLearn> = xmlParam("AfLearn", {
  channelId: optional(int()),
});
