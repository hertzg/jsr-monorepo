/**
 * `<CloudBindInfo>`: whether the camera is bound to a cloud account, read
 * with cmd 268.
 *
 * Firmware: the netserver cmd 268 handler writes `binded`, always, as 1 or
 * 0. No firmware code reads this element.
 *
 * @example Read a cmd 268 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cloudBindInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CloudBindInfo version="1.1"><binded>1</binded></CloudBindInfo>',
 * ).root;
 *
 * assertEquals(cloudBindInfo.decode(root).binded, 1);
 * ```
 *
 * @module
 */

import { int, type XmlParam, xmlParam } from "../xml.ts";

/** The cloud binding state in `<CloudBindInfo>`. */
export type CloudBindInfo = {
  /** 1 when bound, 0 when not; the firmware's spelling. */
  binded: number;
};

/**
 * Codec for `<CloudBindInfo>`.
 *
 * @example Build a `<CloudBindInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { cloudBindInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   cloudBindInfo.encode({ binded: 0 }),
 *   '<CloudBindInfo version="1.1"><binded>0</binded></CloudBindInfo>',
 * );
 * ```
 */
export const cloudBindInfo: XmlParam<"CloudBindInfo", CloudBindInfo> = xmlParam(
  "CloudBindInfo",
  {
    binded: int(),
  },
);
