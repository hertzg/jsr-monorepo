/**
 * `<AfLearnRes>`: the outcome of autofocus learning, with the lens positions
 * and backlash it measured. A factory element that no registered command
 * carries.
 *
 * Firmware: `net_af_learn_s2x` writes every field, always.
 * `net_af_learn_x2s` reads each field when present and skips a missing one,
 * so every field is optional here.
 *
 * @example Read an `<AfLearnRes>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { afLearnRes } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AfLearnRes version="1.1"><zoomPos>120</zoomPos><focusPos>340</focusPos>' +
 *     "<rangeMin>10</rangeMin><rangeMax>900</rangeMax>" +
 *     "<afStudyState>2</afStudyState><afStudyRusult>1</afStudyRusult>" +
 *     "<backLashz>4</backLashz><backLashf>6</backLashf></AfLearnRes>",
 * ).root;
 *
 * assertEquals(afLearnRes.decode(root).focusPos, 340);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The autofocus learning outcome in `<AfLearnRes>`. */
export type AfLearnRes = {
  /** Zoom motor position. */
  zoomPos?: number;
  /** Focus motor position. */
  focusPos?: number;
  /** Lower end of the learned range. */
  rangeMin?: number;
  /** Upper end of the learned range. */
  rangeMax?: number;
  /** Learning state code. */
  afStudyState?: number;
  /** Learning result code; the firmware spells the element `afStudyRusult`. */
  afStudyRusult?: number;
  /** Zoom motor backlash. */
  backLashz?: number;
  /** Focus motor backlash. */
  backLashf?: number;
};

/**
 * Codec for `<AfLearnRes>`.
 *
 * @example Build an `<AfLearnRes>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { afLearnRes } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = afLearnRes.encode({
 *   zoomPos: 120,
 *   focusPos: 340,
 *   rangeMin: 10,
 *   rangeMax: 900,
 *   afStudyState: 2,
 *   afStudyRusult: 1,
 *   backLashz: 4,
 *   backLashf: 6,
 * });
 *
 * assertStringIncludes(xml, "<afStudyRusult>1</afStudyRusult>");
 * ```
 */
export const afLearnRes: XmlParam<"AfLearnRes", AfLearnRes> = xmlParam(
  "AfLearnRes",
  {
    zoomPos: optional(int()),
    focusPos: optional(int()),
    rangeMin: optional(int()),
    rangeMax: optional(int()),
    afStudyState: optional(int()),
    afStudyRusult: optional(int()),
    backLashz: optional(int()),
    backLashf: optional(int()),
  },
);
