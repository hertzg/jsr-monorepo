/**
 * `<HttpPort>`: the HTTP web server port and whether it is on. The camera replies with it to
 * cmd 37 (`GET_NETPORT_CFG_V20`) and reads it from cmd 36
 * (`SET_NETPORT_CFG_V20`).
 *
 * Firmware: the cmd 37 handler writes both fields, always. The parser
 * `nets_param_http_port_cfg_x2s` reads whichever fields are present, so neither
 * is required; a request that leaves one out keeps its current value.
 *
 * @example Read a cmd 37 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { httpPort } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<HttpPort version="1.1"><httpPort>80</httpPort><enable>1</enable></HttpPort>',
 * ).root;
 *
 * assertEquals(httpPort.decode(root), { httpPort: 80, enable: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The port settings in `<HttpPort>`. */
export type HttpPort = {
  /** The port, 1 to 65535. */
  httpPort?: number;
  /** 1 when on, 0 when off. */
  enable?: number;
};

/**
 * Codec for `<HttpPort>`.
 *
 * @example Build a `<HttpPort>` element for cmd 36
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { httpPort } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   httpPort.encode({ httpPort: 8080, enable: 1 }),
 *   '<HttpPort version="1.1"><httpPort>8080</httpPort><enable>1</enable></HttpPort>',
 * );
 * ```
 */
export const httpPort: XmlParam<"HttpPort", HttpPort> = xmlParam("HttpPort", {
  httpPort: optional(int()),
  enable: optional(int()),
});
