/**
 * `<PTOP>`: whether peer-to-peer (cloud relay) access is on. Read with
 * cmd 210, written with cmd 211.
 *
 * Firmware: netserver builds the cmd 210 reply itself and always writes
 * `enable`. `nets_param_ptop_cfg_x2s` reads only the first child, which
 * must be `<enable>` holding 0 or 1, and fails otherwise.
 *
 * @example Read the cmd 210 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptop } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse('<PTOP version="1.1"><enable>1</enable></PTOP>').root;
 *
 * assertEquals(ptop.decode(root).enable, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The peer-to-peer setting in `<PTOP>`. */
export type Ptop = {
  /** 1 for on, 0 for off. */
  enable: number;
};

/**
 * Codec for `<PTOP>`.
 *
 * @example Build a cmd 211 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ptop } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   ptop.encode({ enable: 0 }),
 *   '<PTOP version="1.1"><enable>0</enable></PTOP>',
 * );
 * ```
 */
export const ptop: XmlParam<"PTOP", Ptop> = xmlParam("PTOP", {
  enable: int(),
});
