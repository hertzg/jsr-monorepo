/**
 * `<RtmpPort>`: the RTMP streaming port and whether it is on. The camera replies with it to
 * cmd 37 (`GET_NETPORT_CFG_V20`) and reads it from cmd 36
 * (`SET_NETPORT_CFG_V20`).
 *
 * Firmware: the cmd 37 handler writes both fields, always. The parser
 * `nets_param_rtmp_port_cfg_x2s` reads whichever fields are present, so neither
 * is required; a request that leaves one out keeps its current value.
 * The cmd 37 reply leaves `<RtmpPort>` out entirely when the stored port is
 * 0 or less.
 *
 * @example Read a cmd 37 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { rtmpPort } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<RtmpPort version="1.1"><rtmpPort>1935</rtmpPort><enable>1</enable></RtmpPort>',
 * ).root;
 *
 * assertEquals(rtmpPort.decode(root), { rtmpPort: 1935, enable: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The port settings in `<RtmpPort>`. */
export type RtmpPort = {
  /** The port, 1 to 65535. */
  rtmpPort?: number;
  /** 1 when on, 0 when off. */
  enable?: number;
};

/**
 * Codec for `<RtmpPort>`.
 *
 * @example Build a `<RtmpPort>` element for cmd 36
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { rtmpPort } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   rtmpPort.encode({ rtmpPort: 1936, enable: 1 }),
 *   '<RtmpPort version="1.1"><rtmpPort>1936</rtmpPort><enable>1</enable></RtmpPort>',
 * );
 * ```
 */
export const rtmpPort: XmlParam<"RtmpPort", RtmpPort> = xmlParam("RtmpPort", {
  rtmpPort: optional(int()),
  enable: optional(int()),
});
