/**
 * `<ptzCurPos>`: the current pan and tilt position (cmd 433). Reply only:
 * the request has no body and no parser exists.
 *
 * Firmware: the netserver handler for cmd 433 writes `pPos` and `tPos`,
 * always, from the PTZ module's reply.
 *
 * @example Read the cmd 433 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzCurPos } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ptzCurPos version="1.1"><pPos>1520</pPos><tPos>310</tPos></ptzCurPos>',
 * ).root;
 *
 * assertEquals(ptzCurPos.decode(root), { pPos: 1520, tPos: 310 });
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The current PTZ position in `<ptzCurPos>`; units are not established. */
export type PtzCurPos = {
  /** Pan position. */
  pPos: number;
  /** Tilt position. */
  tPos: number;
};

/**
 * Codec for `<ptzCurPos>`.
 *
 * @example Build a `<ptzCurPos>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ptzCurPos } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   ptzCurPos.encode({ pPos: 0, tPos: 90 }),
 *   '<ptzCurPos version="1.1"><pPos>0</pPos><tPos>90</tPos></ptzCurPos>',
 * );
 * ```
 */
export const ptzCurPos: XmlParam<"ptzCurPos", PtzCurPos> = xmlParam(
  "ptzCurPos",
  {
    pPos: int(),
    tPos: int(),
  },
);
