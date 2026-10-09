/**
 * `<LinkType>`: how the camera is connected to the network, as cmd 93
 * (`GET_LINK_TYPE`) replies. Clients also send cmd 93 as a keepalive.
 *
 * Firmware: `net_link_s2x` writes `type` always, mapping its link index to
 * `PPPOE` (1), `CDMA` (2) or `LAN` (anything else). There is no parser: the
 * camera never reads this element.
 *
 * @example Read a cmd 93 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { linkType } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<LinkType version="1.1"><type>LAN</type></LinkType>').root;
 *
 * assertEquals(linkType.decode(root).type, "LAN");
 * ```
 *
 * @module
 */

import { oneOf, type XmlParam, xmlParam } from "../xml.ts";

/** The network link in `<LinkType>`. */
export type LinkType = {
  /** Wired or Wi-Fi LAN, PPPoE dial-up, or a CDMA modem. */
  type: "LAN" | "PPPOE" | "CDMA";
};

/**
 * Codec for `<LinkType>`.
 *
 * @example Build a `<LinkType>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { linkType } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   linkType.encode({ type: "PPPOE" }),
 *   '<LinkType version="1.1"><type>PPPOE</type></LinkType>',
 * );
 * ```
 */
export const linkType: XmlParam<"LinkType", LinkType> = xmlParam("LinkType", {
  type: oneOf("LAN", "PPPOE", "CDMA"),
});
