/**
 * `<audioPlayInfo>`: a request to play or stop the alarm sound, sent with
 * cmd 263.
 *
 * Firmware: `nets_param_manul_play_x2s` reads whichever fields are
 * present, so every field is optional. No firmware code writes this
 * element, so field order follows the reader.
 *
 * @example Build a cmd 263 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { audioPlayInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = audioPlayInfo.encode({
 *   channelId: 0,
 *   playMode: 0,
 *   playDuration: 10,
 *   playTimes: 1,
 *   onOff: 1,
 * });
 *
 * assertStringIncludes(xml, "<onOff>1</onOff>");
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The play request in `<audioPlayInfo>`. */
export type AudioPlayInfo = {
  /** Zero-based channel. */
  channelId?: number;
  /** Play mode, as a number. */
  playMode?: number;
  /** How long to play. */
  playDuration?: number;
  /** How many times to play. */
  playTimes?: number;
  /** Start or stop playing. */
  onOff?: number;
};

/**
 * Codec for `<audioPlayInfo>`.
 *
 * @example Read a `<audioPlayInfo>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { audioPlayInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<audioPlayInfo version="1.1"><channelId>0</channelId><onOff>0</onOff></audioPlayInfo>',
 * ).root;
 *
 * assertEquals(audioPlayInfo.decode(root), { channelId: 0, onOff: 0 });
 * ```
 */
export const audioPlayInfo: XmlParam<"audioPlayInfo", AudioPlayInfo> = xmlParam(
  "audioPlayInfo",
  {
    channelId: optional(int()),
    playMode: optional(int()),
    playDuration: optional(int()),
    playTimes: optional(int()),
    onOff: optional(int()),
  },
);
