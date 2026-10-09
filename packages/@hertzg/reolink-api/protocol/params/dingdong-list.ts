/**
 * `<dingdongList>`: the chimes (dingdongs) paired with, or found by, a
 * Video Doorbell PoE. Returned by cmd 484, pushed unasked as cmd 484 when
 * the paired list changes, and pushed as cmd 490 during a pairing scan.
 *
 * Firmware (Video Doorbell PoE): three builders write this element, and
 * none of the shapes is read back:
 *
 * ```
 * cmd 484 reply   net_dingdong_list_s2x       maxPairNumber, pairedList / { id, netstate, name }
 * cmd 484 push    netserver 0x7cd74           maxPairNumber, pairedList / { id, name, netState }
 * cmd 490 push    netserver 0x7c72c           scanList / { id, name }
 * ```
 *
 * Every item is a `<dingdongDeviceInfo>`. The reply spells `netstate` in
 * lower case and the push spells `netState`; both are kept as written.
 * `maxPairNumber` comes from `sc_get_max_dingdong_num()`. The cmd 490 push
 * lists only devices whose second word is 0.
 *
 * @example Read a cmd 484 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dingdongList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<dingdongList version="1.1"><maxPairNumber>10</maxPairNumber>' +
 *     "<pairedList><dingdongDeviceInfo><id>0</id><netstate>1</netstate>" +
 *     "<name>Chime</name></dingdongDeviceInfo></pairedList></dingdongList>",
 * ).root;
 *
 * assertEquals(dingdongList.decode(root).pairedList, [
 *   { id: 0, netstate: 1, name: "Chime" },
 * ]);
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A paired chime, a `<dingdongDeviceInfo>` in `<pairedList>`. */
export type DingdongListPairedDevice = {
  /** Chime id. */
  id: number;
  /** Network state, as the cmd 484 reply spells it. Its values are not established. */
  netstate?: number;
  /** Chime name. */
  name: string;
  /** Network state, as the cmd 484 push spells it. Its values are not established. */
  netState?: number;
};

/** A chime found by a pairing scan, a `<dingdongDeviceInfo>` in `<scanList>`. */
export type DingdongListScannedDevice = {
  /** Chime id. */
  id: number;
  /** Chime name. */
  name: string;
};

/** The chime list in `<dingdongList>`. */
export type DingdongList = {
  /** How many chimes can be paired; absent from the cmd 490 push. */
  maxPairNumber?: number;
  /** Paired chimes; cmd 484 only. */
  pairedList?: DingdongListPairedDevice[];
  /** Chimes found by the pairing scan; cmd 490 push only. */
  scanList?: DingdongListScannedDevice[];
};

/**
 * Codec for `<dingdongList>`.
 *
 * @example Read a cmd 490 scan push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dingdongList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<dingdongList version="1.1"><scanList><dingdongDeviceInfo><id>2</id>' +
 *     "<name>Hallway</name></dingdongDeviceInfo></scanList></dingdongList>",
 * ).root;
 *
 * assertEquals(dingdongList.decode(root), {
 *   scanList: [{ id: 2, name: "Hallway" }],
 * });
 * ```
 */
export const dingdongList: XmlParam<"dingdongList", DingdongList> = xmlParam(
  "dingdongList",
  {
    maxPairNumber: optional(int()),
    pairedList: optional(list(
      "dingdongDeviceInfo",
      obj({
        id: int(),
        netstate: optional(int()),
        name: text(),
        netState: optional(int()),
      }),
    )),
    scanList: optional(list(
      "dingdongDeviceInfo",
      obj({ id: int(), name: text() }),
    )),
  },
);
