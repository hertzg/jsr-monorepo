/**
 * `<audioCfg>`: alarm sound settings. Read with cmd 264, written with
 * cmd 265.
 *
 * Firmware: `nets_audio_cfg_s2x` writes every field, always.
 * `nets_param_audio_cfg_x2s` reads whichever fields are present, so every
 * field is optional.
 *
 * @example Read a cmd 264 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { audioCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<audioCfg version="1.1"><channelId>0</channelId><timeout>10</timeout>' +
 *     "<audioSelect>1</audioSelect><volume>80</volume><preAlarm>0</preAlarm>" +
 *     "</audioCfg>",
 * ).root;
 *
 * assertEquals(audioCfg.decode(root).volume, 80);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The alarm sound settings in `<audioCfg>`. */
export type AudioCfg = {
  /** Zero-based channel. */
  channelId?: number;
  /** Timeout. */
  timeout?: number;
  /** Which sound to play, as a number. */
  audioSelect?: number;
  /** Playback volume. */
  volume?: number;
  /** Pre-alarm setting, as a number. */
  preAlarm?: number;
};

/**
 * Codec for `<audioCfg>`.
 *
 * @example Build a `<audioCfg>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { audioCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = audioCfg.encode({
 *   channelId: 0,
 *   timeout: 5,
 *   audioSelect: 0,
 *   volume: 50,
 *   preAlarm: 1,
 * });
 *
 * assertStringIncludes(xml, "<volume>50</volume>");
 * ```
 */
export const audioCfg: XmlParam<"audioCfg", AudioCfg> = xmlParam("audioCfg", {
  channelId: optional(int()),
  timeout: optional(int()),
  audioSelect: optional(int()),
  volume: optional(int()),
  preAlarm: optional(int()),
});
