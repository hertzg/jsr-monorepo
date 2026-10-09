/**
 * `<ftyImageDetechRet>`: the factory image defect detection result. A
 * factory element that no registered command carries; the firmware spells
 * the name `Detech`.
 *
 * Firmware: `net_fty_image_detect_result_x2s` reads each field when present
 * and skips a missing one. `net_fty_image_detect_result_s2x` is an empty
 * stub, so the camera never writes this element.
 *
 * @example Read an `<ftyImageDetechRet>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftyImageDetechRet } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ftyImageDetechRet version="1.1"><deadpix>3</deadpix>' +
 *     "<blot>1</blot></ftyImageDetechRet>",
 * ).root;
 *
 * assertEquals(ftyImageDetechRet.decode(root), { deadpix: 3, blot: 1 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The image defect detection result in `<ftyImageDetechRet>`. */
export type FtyImageDetechRet = {
  /** Dead pixel result. */
  deadpix?: number;
  /** Blot (stain) result. */
  blot?: number;
};

/**
 * Codec for `<ftyImageDetechRet>`.
 *
 * @example Build an `<ftyImageDetechRet>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ftyImageDetechRet } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   ftyImageDetechRet.encode({ deadpix: 0, blot: 2 }),
 *   '<ftyImageDetechRet version="1.1"><deadpix>0</deadpix>' +
 *     "<blot>2</blot></ftyImageDetechRet>",
 * );
 * ```
 */
export const ftyImageDetechRet: XmlParam<
  "ftyImageDetechRet",
  FtyImageDetechRet
> = xmlParam("ftyImageDetechRet", {
  deadpix: optional(int()),
  blot: optional(int()),
});
