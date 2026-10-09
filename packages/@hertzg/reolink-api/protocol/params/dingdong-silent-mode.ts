/**
 * `<dingdongSilentMode>`: silences a paired chime for a while. Read with
 * cmd 609 (`GET_DINGDONG_SILENT_MODE`) and set with cmd 610
 * (`SET_DINGDONG_SILENT_MODE`) on the Video Doorbell PoE.
 *
 * Firmware: `nets_param_dingdong_silent_mode_x2s` reads whichever of `id`,
 * `time` and `type` is present. `nets_param_dingdong_silent_mode_s2x`
 * writes all four fields, always, adding `remainTime`. The units of
 * `time` and `remainTime` and the meaning of `type` are not established.
 *
 * @example Read a cmd 609 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dingdongSilentMode } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<dingdongSilentMode version="1.1"><id>0</id><time>60</time>' +
 *     "<remainTime>30</remainTime><type>1</type></dingdongSilentMode>",
 * ).root;
 *
 * assertEquals(dingdongSilentMode.decode(root).remainTime, 30);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The chime silent mode in `<dingdongSilentMode>`. */
export type DingdongSilentMode = {
  /** The paired chime id. */
  id?: number;
  /**
   * The silent period. Parsed as a 64-bit integer but stored in 32 bits,
   * so only the low 32 bits survive; replies write it sign-extended.
   */
  time?: number;
  /** Reply only: how much of the silent period is left. */
  remainTime?: number;
  /** The silent mode kind; its values are not established. */
  type?: number;
};

/**
 * Codec for `<dingdongSilentMode>`.
 *
 * @example Build a cmd 610 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dingdongSilentMode } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   dingdongSilentMode.encode({ id: 0, time: 60, type: 1 }),
 *   '<dingdongSilentMode version="1.1"><id>0</id><time>60</time>' +
 *     "<type>1</type></dingdongSilentMode>",
 * );
 * ```
 */
export const dingdongSilentMode: XmlParam<
  "dingdongSilentMode",
  DingdongSilentMode
> = xmlParam("dingdongSilentMode", {
  id: optional(int()),
  time: optional(int()),
  remainTime: optional(int()),
  type: optional(int()),
});
