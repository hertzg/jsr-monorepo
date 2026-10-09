/**
 * `<LoginNet>`: how the client reaches the camera, sent with the login
 * (cmd 1).
 *
 * Firmware: `net_login_net_info_x2s` reads `type` (`LAN` or `WAN`, anything
 * else is rejected) and `udpPort` (0 to 65535), both optional. No serializer
 * for it was found, so the shape is the request the camera accepts.
 *
 * @example Read a LAN login
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { loginNet } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<LoginNet version="1.1"><type>LAN</type><udpPort>0</udpPort></LoginNet>',
 * ).root;
 *
 * assertEquals(loginNet.decode(root).type, "LAN");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The client network settings in `<LoginNet>`. */
export type LoginNet = {
  /** Whether the client is on the local network or connects from outside. */
  type?: "LAN" | "WAN";
  /** The client's UDP port, 0 to 65535. */
  udpPort?: number;
};

/**
 * Codec for `<LoginNet>`.
 *
 * @example Build a `<LoginNet>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { loginNet } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = loginNet.encode({ type: "WAN", udpPort: 9000 });
 *
 * assertStringIncludes(xml, "<type>WAN</type>");
 * ```
 */
export const loginNet: XmlParam<"LoginNet", LoginNet> = xmlParam("LoginNet", {
  type: optional(oneOf("LAN", "WAN")),
  udpPort: optional(int()),
});
