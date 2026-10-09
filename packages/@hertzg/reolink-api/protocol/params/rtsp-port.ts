/**
 * `<RtspPort>`: the RTSP streaming port and whether it is on. The camera replies with it to
 * cmd 37 (`GET_NETPORT_CFG_V20`) and reads it from cmd 36
 * (`SET_NETPORT_CFG_V20`).
 *
 * Firmware: the cmd 37 handler writes both fields, always. The parser
 * `nets_param_rtsp_port_cfg_x2s` reads whichever fields are present, so neither
 * is required; a request that leaves one out keeps its current value.
 *
 * @example Read a cmd 37 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { rtspPort } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<RtspPort version="1.1"><rtspPort>554</rtspPort><enable>1</enable></RtspPort>',
 * ).root;
 *
 * assertEquals(rtspPort.decode(root), { rtspPort: 554, enable: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The port settings in `<RtspPort>`. */
export type RtspPort = {
  /** The port, 1 to 65535. */
  rtspPort?: number;
  /** 1 when on, 0 when off. */
  enable?: number;
};

/**
 * Codec for `<RtspPort>`.
 *
 * @example Build a `<RtspPort>` element for cmd 36
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rtspPort } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   rtspPort.encode({ rtspPort: 8554, enable: 1 }),
 *   '<RtspPort version="1.1"><rtspPort>8554</rtspPort><enable>1</enable></RtspPort>',
 * );
 * ```
 */
export const rtspPort: XmlParam<"RtspPort", RtspPort> = xmlParam("RtspPort", {
  rtspPort: optional(int()),
  enable: optional(int()),
});
