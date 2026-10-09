/**
 * `<ServerPort>`: the Baichuan media server port (the port this client talks to) and whether it is on. The camera replies with it to
 * cmd 37 (`GET_NETPORT_CFG_V20`) and reads it from cmd 36
 * (`SET_NETPORT_CFG_V20`).
 *
 * Firmware: the cmd 37 handler writes both fields, always. The parser
 * `nets_param_surv_port_cfg_x2s` reads whichever fields are present, so neither
 * is required; a request that leaves one out keeps its current value.
 *
 * @example Read a cmd 37 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { serverPort } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ServerPort version="1.1"><serverPort>9000</serverPort><enable>1</enable></ServerPort>',
 * ).root;
 *
 * assertEquals(serverPort.decode(root), { serverPort: 9000, enable: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The port settings in `<ServerPort>`. */
export type ServerPort = {
  /** The port, 1 to 65535. */
  serverPort?: number;
  /** 1 when on, 0 when off. */
  enable?: number;
};

/**
 * Codec for `<ServerPort>`.
 *
 * @example Build a `<ServerPort>` element for cmd 36
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { serverPort } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   serverPort.encode({ serverPort: 9001, enable: 1 }),
 *   '<ServerPort version="1.1"><serverPort>9001</serverPort><enable>1</enable></ServerPort>',
 * );
 * ```
 */
export const serverPort: XmlParam<"ServerPort", ServerPort> = xmlParam(
  "ServerPort",
  {
    serverPort: optional(int()),
    enable: optional(int()),
  },
);
