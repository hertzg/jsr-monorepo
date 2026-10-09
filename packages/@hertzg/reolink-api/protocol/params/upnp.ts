/**
 * `<Upnp>`: whether UPnP port mapping is on. Read with cmd 97
 * (`GET_UPNPSTATE_V20`) and written with cmd 98 (`SET_UPNPSTATE_V20`).
 *
 * Firmware: the cmd 97 handler in `netserver` writes `enable` always, and
 * `nets_param_upnp_cfg_x2s` fails without it.
 *
 * @example Read a cmd 97 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { upnp } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<Upnp version="1.1"><enable>1</enable></Upnp>').root;
 *
 * assertEquals(upnp.decode(root).enable, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The UPnP switch in `<Upnp>`. */
export type Upnp = {
  /** 1 when UPnP is on, 0 when off. */
  enable: number;
};

/**
 * Codec for `<Upnp>`.
 *
 * @example Build a `<Upnp>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { upnp } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   upnp.encode({ enable: 0 }),
 *   '<Upnp version="1.1"><enable>0</enable></Upnp>',
 * );
 * ```
 */
export const upnp: XmlParam<"Upnp", Upnp> = xmlParam("Upnp", {
  enable: int(),
});
