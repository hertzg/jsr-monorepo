/**
 * `<Dhcp>`: whether the camera takes its address from DHCP. Read with cmd 76
 * (`GET_LOCAL_LINK_V20`) and written with cmd 77 (`SET_LOCAL_LINK_V20`), next
 * to `<AutoDns>`, `<Ip>` and `<Dns>`.
 *
 * Firmware: `net_dhcp_s2x` writes `enable` always, and `net_dhcp_x2s` fails
 * without it.
 *
 * @example Read a cmd 76 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dhcp } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Dhcp version="1.1"><enable>1</enable></Dhcp>').root;
 *
 * assertEquals(dhcp.decode(root).enable, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The DHCP switch in `<Dhcp>`. */
export type Dhcp = {
  /** 1 to take the address from DHCP, 0 to use the static `<Ip>`. */
  enable: number;
};

/**
 * Codec for `<Dhcp>`.
 *
 * @example Build a `<Dhcp>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dhcp } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   dhcp.encode({ enable: 0 }),
 *   '<Dhcp version="1.1"><enable>0</enable></Dhcp>',
 * );
 * ```
 */
export const dhcp: XmlParam<"Dhcp", Dhcp> = xmlParam("Dhcp", {
  enable: int(),
});
