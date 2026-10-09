/**
 * `<StartZoomFocus>`: moves the zoom or focus motor to a position. Sent
 * with cmd 295 (the firmware table names it `GET_ZOOM_FOCUS_INFO_V20`, a
 * copy of cmd 294's name, but its handler starts movement).
 *
 * Firmware: `nets_param_start_zoom_focus_x2s` reads `channelId`, `command`
 * and `movePos`, skipping any that are missing. It rejects a `channelId`
 * above 63, a negative `movePos`, and a `command` that `_get_ptz_cmd` does
 * not know. Use `zoomPos` or `focusPos` with a position inside the range
 * cmd 294 reports. No serializer exists. Every field is optional.
 *
 * @example Read a `<StartZoomFocus>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { startZoomFocus } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<StartZoomFocus version="1.1"><channelId>0</channelId>' +
 *     "<command>zoomPos</command><movePos>100</movePos></StartZoomFocus>",
 * ).root;
 *
 * assertEquals(startZoomFocus.decode(root).command, "zoomPos");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** A zoom or focus move in `<StartZoomFocus>`. */
export type StartZoomFocus = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /**
   * The PTZ command, one of the 37 names `_get_ptz_cmd` accepts. Only
   * `zoomPos` and `focusPos` move to `movePos`; the camera decides which
   * others it acts on.
   */
  command?:
    | "stop"
    | "left"
    | "right"
    | "up"
    | "down"
    | "leftUp"
    | "leftDown"
    | "rightUp"
    | "rightDown"
    | "irisDec"
    | "irisInc"
    | "zoomDec"
    | "zoomInc"
    | "focusDec"
    | "focusInc"
    | "setPos"
    | "delPos"
    | "toPos"
    | "auto"
    | "highSpeed"
    | "startPatrol"
    | "stopPatrol"
    | "clearPatrol"
    | "enablePattern"
    | "startPattern"
    | "stopPattern"
    | "startSavePattern"
    | "stopSavePattern"
    | "cleanPattern"
    | "zoomPos"
    | "focusPos"
    | "zoomStepInc"
    | "zoomStepDec"
    | "focusStepInc"
    | "focusStepDec"
    | "setGrd"
    | "toGrd";
  /** Target position; the firmware rejects a negative value. */
  movePos?: number;
};

/**
 * Codec for `<StartZoomFocus>`.
 *
 * @example Build a focus move
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { startZoomFocus } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   startZoomFocus.encode({ channelId: 0, command: "focusPos", movePos: 250 }),
 *   '<StartZoomFocus version="1.1"><channelId>0</channelId>' +
 *     "<command>focusPos</command><movePos>250</movePos></StartZoomFocus>",
 * );
 * ```
 */
export const startZoomFocus: XmlParam<"StartZoomFocus", StartZoomFocus> =
  xmlParam("StartZoomFocus", {
    channelId: optional(int()),
    command: optional(oneOf(
      "stop",
      "left",
      "right",
      "up",
      "down",
      "leftUp",
      "leftDown",
      "rightUp",
      "rightDown",
      "irisDec",
      "irisInc",
      "zoomDec",
      "zoomInc",
      "focusDec",
      "focusInc",
      "setPos",
      "delPos",
      "toPos",
      "auto",
      "highSpeed",
      "startPatrol",
      "stopPatrol",
      "clearPatrol",
      "enablePattern",
      "startPattern",
      "stopPattern",
      "startSavePattern",
      "stopSavePattern",
      "cleanPattern",
      "zoomPos",
      "focusPos",
      "zoomStepInc",
      "zoomStepDec",
      "focusStepInc",
      "focusStepDec",
      "setGrd",
      "toGrd",
    )),
    movePos: optional(int()),
  });
