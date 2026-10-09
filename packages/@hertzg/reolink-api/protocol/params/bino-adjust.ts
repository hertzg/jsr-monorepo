/**
 * `<BinoAdjust>`: binocular (two-lens) image alignment. No command in the
 * request table uses it.
 *
 * Firmware (Video Doorbell PoE): `nets_param_bino_adjust_x2s` reads
 * `lineWidthRef`, `lineWidthMin`, `lineWidthMax` and `heightDiffMax` when
 * present, skips the rest, and rejects a negative value. No library
 * serializer exists. A netserver reply builder (0x81100, `nets_snap.cpp`)
 * writes `heightDiff` and `widthDiff` from the same parameter, but no
 * command is known to reach it. Every field is optional.
 *
 * @example Read a `<BinoAdjust>` reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { binoAdjust } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<BinoAdjust version="1.1"><heightDiff>3</heightDiff>' +
 *     "<widthDiff>7</widthDiff></BinoAdjust>",
 * ).root;
 *
 * assertEquals(binoAdjust.decode(root), { heightDiff: 3, widthDiff: 7 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The binocular alignment request and result in `<BinoAdjust>`. */
export type BinoAdjust = {
  /** Reference line width, 0 or more; request only. */
  lineWidthRef?: number;
  /** Smallest accepted line width, 0 or more; request only. */
  lineWidthMin?: number;
  /** Largest accepted line width, 0 or more; request only. */
  lineWidthMax?: number;
  /** Largest accepted height difference, 0 or more; request only. */
  heightDiffMax?: number;
  /** Measured height difference; reply only. */
  heightDiff?: number;
  /** Measured width difference; reply only. */
  widthDiff?: number;
};

/**
 * Codec for `<BinoAdjust>`.
 *
 * @example Build a `<BinoAdjust>` request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { binoAdjust } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = binoAdjust.encode({
 *   lineWidthRef: 10,
 *   lineWidthMin: 8,
 *   lineWidthMax: 12,
 *   heightDiffMax: 4,
 * });
 *
 * assertStringIncludes(xml, "<lineWidthRef>10</lineWidthRef>");
 * ```
 */
export const binoAdjust: XmlParam<"BinoAdjust", BinoAdjust> = xmlParam(
  "BinoAdjust",
  {
    lineWidthRef: optional(int()),
    lineWidthMin: optional(int()),
    lineWidthMax: optional(int()),
    heightDiffMax: optional(int()),
    heightDiff: optional(int()),
    widthDiff: optional(int()),
  },
);
