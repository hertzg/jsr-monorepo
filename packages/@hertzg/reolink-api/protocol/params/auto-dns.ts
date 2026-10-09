/**
 * `<AutoDns>`: whether the camera takes its DNS servers from DHCP. Read with
 * cmd 76 (`GET_LOCAL_LINK_V20`) and written with cmd 77
 * (`SET_LOCAL_LINK_V20`), next to `<Dhcp>`, `<Ip>` and `<Dns>`.
 *
 * Firmware: `net_autodns_s2x` writes `enable` always, and `net_autodns_x2s`
 * fails without it.
 *
 * @example Read a cmd 76 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { autoDns } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<AutoDns version="1.1"><enable>1</enable></AutoDns>').root;
 *
 * assertEquals(autoDns.decode(root).enable, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The automatic DNS switch in `<AutoDns>`. */
export type AutoDns = {
  /** 1 to take DNS servers from DHCP, 0 to use `<Dns>`. */
  enable: number;
};

/**
 * Codec for `<AutoDns>`.
 *
 * @example Build an `<AutoDns>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { autoDns } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   autoDns.encode({ enable: 0 }),
 *   '<AutoDns version="1.1"><enable>0</enable></AutoDns>',
 * );
 * ```
 */
export const autoDns: XmlParam<"AutoDns", AutoDns> = xmlParam("AutoDns", {
  enable: int(),
});
