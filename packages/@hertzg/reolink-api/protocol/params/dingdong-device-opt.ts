/**
 * `<dingdongDeviceOpt>`: adds, removes, reads, configures or rings one
 * chime (dingdong). Sent and returned with cmd 485.
 *
 * Firmware (Video Doorbell PoE): `net_dingdong_dev_opt_x2s` reads each
 * field when present and skips the rest. It rejects a negative `id` or
 * `musicId`, an `opt` it does not map, an `opt` of 16 bytes or more and a
 * `name` of 32 bytes or more. No library serializer exists. The cmd 485
 * reply is built in netserver (0x94de4) and has a body only for
 * `getParam`: then it always writes `id`, `volLevel`, `ledState` and
 * `name`. Every field is optional.
 *
 * @example Build a cmd 485 request that rings a chime
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dingdongDeviceOpt } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   dingdongDeviceOpt.encode({ id: 0, opt: "ringWithMusic", musicId: 1 }),
 *   '<dingdongDeviceOpt version="1.1"><id>0</id><opt>ringWithMusic</opt>' +
 *     "<musicId>1</musicId></dingdongDeviceOpt>",
 * );
 * ```
 *
 * @module
 */

import {
  int,
  oneOf,
  optional,
  text,
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The chime operation in `<dingdongDeviceOpt>`. */
export type DingdongDeviceOpt = {
  /** Chime id, 0 or more. */
  id?: number;
  /** What to do with the chime; request only. */
  opt?: "addDevice" | "delDevice" | "getParam" | "setParam" | "ringWithMusic";
  /** Ringtone id, 0 or more; request only. */
  musicId?: number;
  /** Volume level. Its range is not established. */
  volLevel?: number;
  /** LED state. Its values are not established. */
  ledState?: number;
  /** Chime name, up to 31 bytes. */
  name?: string;
};

/**
 * Codec for `<dingdongDeviceOpt>`.
 *
 * @example Read a cmd 485 `getParam` reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dingdongDeviceOpt } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<dingdongDeviceOpt version="1.1"><id>0</id><volLevel>3</volLevel>' +
 *     "<ledState>1</ledState><name>Chime</name></dingdongDeviceOpt>",
 * ).root;
 *
 * assertEquals(dingdongDeviceOpt.decode(root), {
 *   id: 0,
 *   volLevel: 3,
 *   ledState: 1,
 *   name: "Chime",
 * });
 * ```
 */
export const dingdongDeviceOpt: XmlParam<
  "dingdongDeviceOpt",
  DingdongDeviceOpt
> = xmlParam("dingdongDeviceOpt", {
  id: optional(int()),
  opt: optional(
    oneOf("addDevice", "delDevice", "getParam", "setParam", "ringWithMusic"),
  ),
  musicId: optional(int()),
  volLevel: optional(uint()),
  ledState: optional(uint()),
  name: optional(text()),
});
