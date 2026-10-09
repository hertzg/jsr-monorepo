/**
 * `<ZoomFocusInfo>`: asks for the zoom and focus motor positions of a
 * channel with cmd 294.
 *
 * The reply element is `<PtzZoomFocus>`, not `<ZoomFocusInfo>`: the cmd 294
 * handler builds `<PtzZoomFocus>` and fills it with
 * `nets_param_zoom_focus_info_s2x`, which writes `channelId`, `zoom` and
 * `focus` (each with `maxPos`, `minPos` and `curPos`), always. Its children
 * match this codec, so {@link zoomFocusInfo} decodes the reply element too.
 * `nets_param_zoom_focus_info_x2s` skips any field that is missing and
 * rejects a `channelId` above 63, so every field is optional.
 *
 * @example Read the `<PtzZoomFocus>` reply to cmd 294
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { zoomFocusInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzZoomFocus version="1.1"><channelId>0</channelId>' +
 *     "<zoom><maxPos>1000</maxPos><minPos>0</minPos><curPos>100</curPos></zoom>" +
 *     "<focus><maxPos>1000</maxPos><minPos>0</minPos><curPos>200</curPos></focus>" +
 *     "</PtzZoomFocus>",
 * ).root;
 *
 * assertEquals(zoomFocusInfo.decode(root).focus?.curPos, 200);
 * ```
 *
 * @module
 */

import { int, obj, optional, type XmlParam, xmlParam } from "../xml.ts";

/** One motor's range and position in `<ZoomFocusInfo>`. */
export type ZoomFocusPos = {
  /** Highest position. */
  maxPos?: number;
  /** Lowest position. */
  minPos?: number;
  /** Current position. */
  curPos?: number;
};

/** The zoom and focus positions in `<ZoomFocusInfo>`. */
export type ZoomFocusInfo = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** Zoom motor. */
  zoom?: ZoomFocusPos;
  /** Focus motor. */
  focus?: ZoomFocusPos;
};

function position() {
  return obj({
    maxPos: optional(int()),
    minPos: optional(int()),
    curPos: optional(int()),
  });
}

/**
 * Codec for `<ZoomFocusInfo>`.
 *
 * @example Build the cmd 294 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { zoomFocusInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   zoomFocusInfo.encode({ channelId: 0 }),
 *   '<ZoomFocusInfo version="1.1"><channelId>0</channelId></ZoomFocusInfo>',
 * );
 * ```
 */
export const zoomFocusInfo: XmlParam<"ZoomFocusInfo", ZoomFocusInfo> = xmlParam(
  "ZoomFocusInfo",
  {
    channelId: optional(int()),
    zoom: optional(position()),
    focus: optional(position()),
  },
);
