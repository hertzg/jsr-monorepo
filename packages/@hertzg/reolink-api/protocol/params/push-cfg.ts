/**
 * `<PushCfg>`: the push notification settings (cmd 363 reads them, cmd 364
 * sets them).
 *
 * Firmware: the netserver handler for cmd 363 writes `interval`, always.
 * `nets_param_push_cfg_x2s` reads it when present (rejecting negative
 * values) and skips it otherwise, so it may be missing from a request.
 *
 * @example Read the cmd 363 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<PushCfg version="1.1"><interval>30</interval></PushCfg>')
 *   .root;
 *
 * assertEquals(pushCfg.decode(root), { interval: 30 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The push notification settings in `<PushCfg>`. */
export type PushCfg = {
  /** Push interval, zero or more; the firmware does not name the unit. */
  interval?: number;
  /** Rich (picture) notifications switch, by its name. Video Doorbell PoE only. */
  richNotificationEnable?: number;
  /** Push consent switch, by its name. Video Doorbell PoE only. */
  consentAgreement?: number;
};

/**
 * Codec for `<PushCfg>`.
 *
 * @example Set the push interval
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { pushCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   pushCfg.encode({ interval: 60 }),
 *   '<PushCfg version="1.1"><interval>60</interval></PushCfg>',
 * );
 * ```
 */
export const pushCfg: XmlParam<"PushCfg", PushCfg> = xmlParam("PushCfg", {
  interval: optional(int()),
  richNotificationEnable: optional(int()),
  consentAgreement: optional(int()),
});
