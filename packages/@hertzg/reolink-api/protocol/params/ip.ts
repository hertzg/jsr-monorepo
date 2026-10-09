/**
 * `<Ip>`: the camera's wired address. Read with cmd 76
 * (`GET_LOCAL_LINK_V20`) and written with cmd 77 (`SET_LOCAL_LINK_V20`), next
 * to `<AutoDns>`, `<Dhcp>` and `<Dns>`.
 *
 * Firmware: `net_ethernet_s2x` writes every field always.
 * `net_ethernet_x2s` reads whichever is present, so a request may carry a
 * subset; it rejects a `mac` that is not exactly 17 characters.
 *
 * @example Read a cmd 76 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ip } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Ip version="1.1"><ip>192.168.1.20</ip><mask>255.255.255.0</mask>' +
 *     "<mac>ec:71:db:12:34:56</mac><gateway>192.168.1.1</gateway></Ip>",
 * ).root;
 *
 * assertEquals(ip.decode(root).gateway, "192.168.1.1");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The wired address in `<Ip>`. */
export type Ip = {
  /** IPv4 address. */
  ip?: string;
  /** Subnet mask. */
  mask?: string;
  /** MAC address, 17 characters such as `ec:71:db:12:34:56`. */
  mac?: string;
  /** Default gateway. */
  gateway?: string;
};

/**
 * Codec for `<Ip>`.
 *
 * @example Build an `<Ip>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ip } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ip.encode({
 *   ip: "10.0.0.20",
 *   mask: "255.255.0.0",
 *   gateway: "10.0.0.1",
 * });
 *
 * assertStringIncludes(xml, "<mask>255.255.0.0</mask>");
 * ```
 */
export const ip: XmlParam<"Ip", Ip> = xmlParam("Ip", {
  ip: optional(text()),
  mask: optional(text()),
  mac: optional(text()),
  gateway: optional(text()),
});
