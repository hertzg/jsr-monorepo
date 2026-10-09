/**
 * `<AutoFocus>`: whether continuous autofocus is turned off. Read with
 * cmd 224, written with cmd 225.
 *
 * Firmware: the netserver cmd 224 handler (`nets_auto_focus_get`) writes
 * both fields, always. `nets_param_auto_focus_x2s` reads whichever fields
 * are present, so both are optional; it rejects a negative `channelId` and
 * a `disable` other than 0 or 1.
 *
 * @example Read a cmd 224 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { autoFocus } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AutoFocus version="1.1"><channelId>0</channelId><disable>0</disable></AutoFocus>',
 * ).root;
 *
 * assertEquals(autoFocus.decode(root).disable, 0);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The autofocus switch in `<AutoFocus>`. */
export type AutoFocus = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 turns autofocus off, 0 leaves it on. */
  disable?: number;
};

/**
 * Codec for `<AutoFocus>`.
 *
 * @example Build a `<AutoFocus>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { autoFocus } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   autoFocus.encode({ channelId: 0, disable: 1 }),
 *   '<AutoFocus version="1.1"><channelId>0</channelId><disable>1</disable></AutoFocus>',
 * );
 * ```
 */
export const autoFocus: XmlParam<"AutoFocus", AutoFocus> = xmlParam(
  "AutoFocus",
  {
    channelId: optional(int()),
    disable: optional(int()),
  },
);
