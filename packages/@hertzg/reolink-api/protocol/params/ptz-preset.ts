/**
 * `<PtzPreset>`: saved PTZ positions, set or recalled with cmd 19 and listed
 * by cmd 190.
 *
 * Firmware: the cmd 190 reply (`nets_ptz_preset_get` in netserver; the
 * library `net_ptz_preset_s2x` writes nothing) always writes `channelId`,
 * `maxPresetNum` (64), `maxPresetPicNum` (64) and `presetList`, with `id`,
 * `name` and `imageName` for each saved preset. `net_ptz_preset_x2s`
 * requires `channelId` (0 to 63) and, in each `<preset>`, `id` (0 to 255);
 * it reads `command`, `name` and `imageName` as optional.
 *
 * @example Read the cmd 190 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ptzPreset } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PtzPreset version="1.1"><channelId>0</channelId>' +
 *     "<maxPresetNum>64</maxPresetNum><maxPresetPicNum>64</maxPresetPicNum>" +
 *     "<presetList><preset><id>1</id><name>gate</name><imageName></imageName>" +
 *     "</preset></presetList></PtzPreset>",
 * ).root;
 *
 * assertEquals(ptzPreset.decode(root).presetList?.[0].name, "gate");
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  oneOf,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The saved PTZ positions in `<PtzPreset>`. */
export type PtzPreset = {
  /** Zero-based channel, 0 to 63. */
  channelId: number;
  /** How many presets the camera can save; written as 64. */
  maxPresetNum?: number;
  /** How many preset pictures the camera can save; written as 64. */
  maxPresetPicNum?: number;
  /** The presets: saved ones in a reply, the one to act on in a request. */
  presetList?: {
    /** Preset id, 0 to 255. */
    id: number;
    /** Name it was saved under; up to 31 characters. */
    name?: string;
    /** Name of its picture; up to 31 characters. */
    imageName?: string;
    /** What to do with it in a request, usually `setPos`, `delPos` or `toPos`. */
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
  }[];
};

/**
 * Codec for `<PtzPreset>`.
 *
 * @example Build a request that moves to preset 3
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ptzPreset } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ptzPreset.encode({
 *   channelId: 0,
 *   presetList: [{ id: 3, command: "toPos" }],
 * });
 *
 * assertStringIncludes(xml, "<preset><id>3</id><command>toPos</command></preset>");
 * ```
 */
export const ptzPreset: XmlParam<"PtzPreset", PtzPreset> = xmlParam(
  "PtzPreset",
  {
    channelId: int(),
    maxPresetNum: optional(int()),
    maxPresetPicNum: optional(int()),
    presetList: optional(list(
      "preset",
      obj({
        id: int(),
        name: optional(text()),
        imageName: optional(text()),
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
      }),
    )),
  },
);
