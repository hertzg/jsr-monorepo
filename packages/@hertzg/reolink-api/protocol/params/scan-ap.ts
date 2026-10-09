/**
 * `<ScanAp>`: the Wi-Fi access points the camera can see. Sent in the reply
 * to cmd 198.
 *
 * Firmware: `net_scan_ap_s2x` in the RLC-823A and the Video Doorbell PoE
 * firmware writes `udidList` only when at least one access point was found,
 * at most 128, and writes every `<udid>` field, always, except `type`, which
 * only the RLC-823A writes.
 *
 * @example Read the cmd 198 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { scanAp } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ScanAp version="1.1"><udidList><udid><name>HomeNet</name>' +
 *     "<signal>80</signal><encrypt>1</encrypt><type>0</type></udid>" +
 *     "</udidList></ScanAp>",
 * ).root;
 *
 * assertEquals(scanAp.decode(root).udidList?.[0].name, "HomeNet");
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

/** One access point in `<udidList>`, as a `<udid>` element. */
export type ScanApUdid = {
  /** The access point's SSID. */
  name: string;
  /** Signal strength. */
  signal: number;
  /** Encryption as a number. */
  encrypt: number;
  /** Network type as a number; RLC-823A only. */
  type?: number;
};

/** The scanned access points in `<ScanAp>`. */
export type ScanAp = {
  /** The access points; omitted when none were found. */
  udidList?: ScanApUdid[];
};

/**
 * Codec for `<ScanAp>`.
 *
 * @example Read a scan that found nothing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { scanAp } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<ScanAp version="1.1"></ScanAp>').root;
 *
 * assertEquals(scanAp.decode(root), {});
 * ```
 */
export const scanAp: XmlParam<"ScanAp", ScanAp> = xmlParam("ScanAp", {
  udidList: optional(list(
    "udid",
    obj({
      name: text(),
      signal: int(),
      encrypt: int(),
      type: optional(int()),
    }),
  )),
});
