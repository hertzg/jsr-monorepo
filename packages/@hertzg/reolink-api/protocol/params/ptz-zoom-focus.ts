/**
 * `<PtzZoomFocus>`: the zoom and focus motor ranges and positions in the
 * cmd 294 reply. The request names `<ZoomFocusInfo>`, but the reply carries
 * this element instead.
 *
 * Firmware: the cmd 294 handler creates `<PtzZoomFocus>` and
 * `nets_param_zoom_focus_info_s2x` fills it with every field, always.
 *
 * @example Read the cmd 294 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzZoomFocus } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzZoomFocus version="1.1"><channelId>0</channelId>' +
 *     "<zoom><maxPos>32</maxPos><minPos>0</minPos><curPos>5</curPos></zoom>" +
 *     "<focus><maxPos>248</maxPos><minPos>0</minPos><curPos>117</curPos></focus>" +
 *     "</PtzZoomFocus>",
 * ).root;
 *
 * assertEquals(ptzZoomFocus.decode(root).zoom.curPos, 5);
 * ```
 *
 * @module
 */

import { int, obj, type XmlParam, xmlParam } from "../xml.ts";

/** One motor's range and position; units are not established. */
export type PtzZoomFocusRange = {
  /** Highest position. */
  maxPos: number;
  /** Lowest position. */
  minPos: number;
  /** Current position. */
  curPos: number;
};

/** The zoom and focus state in `<PtzZoomFocus>`. */
export type PtzZoomFocus = {
  /** Zero-based channel. */
  channelId: number;
  /** The zoom motor. */
  zoom: PtzZoomFocusRange;
  /** The focus motor. */
  focus: PtzZoomFocusRange;
};

/**
 * Codec for `<PtzZoomFocus>`.
 *
 * @example Build a `<PtzZoomFocus>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzZoomFocus } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptzZoomFocus.encode({
 *   channelId: 0,
 *   zoom: { maxPos: 32, minPos: 0, curPos: 0 },
 *   focus: { maxPos: 248, minPos: 0, curPos: 64 },
 * });
 *
 * assertStringIncludes(xml, "<curPos>64</curPos></focus>");
 * ```
 */
export const ptzZoomFocus: XmlParam<"PtzZoomFocus", PtzZoomFocus> = xmlParam(
  "PtzZoomFocus",
  {
    channelId: int(),
    zoom: obj({ maxPos: int(), minPos: int(), curPos: int() }),
    focus: obj({ maxPos: int(), minPos: int(), curPos: int() }),
  },
);
