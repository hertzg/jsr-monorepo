/**
 * `<HttpsPort>`: the HTTPS web server port and whether it is on. The camera replies with it to
 * cmd 37 (`GET_NETPORT_CFG_V20`) and reads it from cmd 36
 * (`SET_NETPORT_CFG_V20`).
 *
 * Firmware: the cmd 37 handler writes both fields, always. The parser
 * `nets_param_https_port_cfg_x2s` reads whichever fields are present, so neither
 * is required; a request that leaves one out keeps its current value.
 *
 * @example Read a cmd 37 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { httpsPort } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<HttpsPort version="1.1"><httpsPort>443</httpsPort><enable>1</enable></HttpsPort>',
 * ).root;
 *
 * assertEquals(httpsPort.decode(root), { httpsPort: 443, enable: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The port settings in `<HttpsPort>`. */
export type HttpsPort = {
  /** The port, 1 to 65535. */
  httpsPort?: number;
  /** 1 when on, 0 when off. */
  enable?: number;
};

/**
 * Codec for `<HttpsPort>`.
 *
 * @example Build a `<HttpsPort>` element for cmd 36
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { httpsPort } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   httpsPort.encode({ httpsPort: 8443, enable: 1 }),
 *   '<HttpsPort version="1.1"><httpsPort>8443</httpsPort><enable>1</enable></HttpsPort>',
 * );
 * ```
 */
export const httpsPort: XmlParam<"HttpsPort", HttpsPort> = xmlParam(
  "HttpsPort",
  {
    httpsPort: optional(int()),
    enable: optional(int()),
  },
);
