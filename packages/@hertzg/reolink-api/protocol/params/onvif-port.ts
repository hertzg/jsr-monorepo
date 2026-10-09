/**
 * `<OnvifPort>`: the ONVIF service port and whether it is on. The camera replies with it to
 * cmd 37 (`GET_NETPORT_CFG_V20`) and reads it from cmd 36
 * (`SET_NETPORT_CFG_V20`).
 *
 * Firmware: the cmd 37 handler writes both fields, always. The parser
 * `nets_param_onvif_port_cfg_x2s` reads whichever fields are present, so neither
 * is required; a request that leaves one out keeps its current value.
 *
 * @example Read a cmd 37 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { onvifPort } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<OnvifPort version="1.1"><onvifPort>8000</onvifPort><enable>1</enable></OnvifPort>',
 * ).root;
 *
 * assertEquals(onvifPort.decode(root), { onvifPort: 8000, enable: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The port settings in `<OnvifPort>`. */
export type OnvifPort = {
  /** The port, 1 to 65535. */
  onvifPort?: number;
  /** 1 when on, 0 when off. */
  enable?: number;
};

/**
 * Codec for `<OnvifPort>`.
 *
 * @example Build a `<OnvifPort>` element for cmd 36
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { onvifPort } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   onvifPort.encode({ onvifPort: 8001, enable: 1 }),
 *   '<OnvifPort version="1.1"><onvifPort>8001</onvifPort><enable>1</enable></OnvifPort>',
 * );
 * ```
 */
export const onvifPort: XmlParam<"OnvifPort", OnvifPort> = xmlParam(
  "OnvifPort",
  {
    onvifPort: optional(int()),
    enable: optional(int()),
  },
);
