/**
 * `<Dns>`: the static DNS servers. Read with cmd 76 (`GET_LOCAL_LINK_V20`)
 * and written with cmd 77 (`SET_LOCAL_LINK_V20`), next to `<AutoDns>`,
 * `<Dhcp>` and `<Ip>`.
 *
 * Firmware: `net_dns_info_s2x` writes both fields always.
 * `net_dns_info_x2s` reads whichever is present, so a request may carry just
 * one; it rejects a value that fails its `is_legal_string` check.
 *
 * @example Read a cmd 76 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dns } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Dns version="1.1"><dns1>192.168.1.1</dns1><dns2>8.8.8.8</dns2></Dns>',
 * ).root;
 *
 * assertEquals(dns.decode(root).dns2, "8.8.8.8");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The static DNS servers in `<Dns>`. */
export type Dns = {
  /** Primary DNS server address, up to 15 characters. */
  dns1?: string;
  /** Secondary DNS server address, up to 15 characters. */
  dns2?: string;
};

/**
 * Codec for `<Dns>`.
 *
 * @example Change only the primary server
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dns } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   dns.encode({ dns1: "1.1.1.1" }),
 *   '<Dns version="1.1"><dns1>1.1.1.1</dns1></Dns>',
 * );
 * ```
 */
export const dns: XmlParam<"Dns", Dns> = xmlParam("Dns", {
  dns1: optional(text()),
  dns2: optional(text()),
});
