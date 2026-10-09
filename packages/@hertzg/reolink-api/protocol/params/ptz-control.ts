/**
 * `<PtzControl>`: a pan, tilt, zoom, focus, patrol or pattern command
 * (cmd 18).
 *
 * Firmware: `net_ptz_info_x2s` reads every field as optional and checks the
 * ranges noted on each field. `command` goes through `_get_ptz_cmd`, which
 * accepts exactly the 37 names below, compared without regard to case.
 * `net_ptz_info_s2x` writes nothing, so the camera never sends it back.
 *
 * @example Read a move request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzControl } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzControl version="1.1"><channelId>0</channelId>' +
 *     "<command>left</command><speed>32</speed></PtzControl>",
 * ).root;
 *
 * assertEquals(ptzControl.decode(root).command, "left");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The PTZ command in `<PtzControl>`. */
export type PtzControl = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** What to do; a move keeps going until `stop`. */
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
  /** Patrol (cruise) id, 0 to 5. */
  patrolId?: number;
  /** Key position within a patrol, 0 to 15. */
  keyPos?: number;
  /** Preset id, 0 to 63. */
  presetId?: number;
  /** Pattern id, 0 to 5. */
  patternId?: number;
  /** Move speed, 0 to 100. */
  speed?: number;
  /** Dwell time at a key position; at least 1. */
  dwellTime?: number;
};

/**
 * Codec for `<PtzControl>`.
 *
 * @example Build a zoom request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzControl } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptzControl.encode({ channelId: 0, command: "zoomInc", speed: 10 });
 *
 * assertStringIncludes(xml, "<command>zoomInc</command>");
 * ```
 */
export const ptzControl: XmlParam<"PtzControl", PtzControl> = xmlParam(
  "PtzControl",
  {
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
    patrolId: optional(int()),
    keyPos: optional(int()),
    presetId: optional(int()),
    patternId: optional(int()),
    speed: optional(int()),
    dwellTime: optional(int()),
  },
);
