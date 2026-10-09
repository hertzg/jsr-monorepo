/**
 * `<AiCfg>`: AI detection and smart tracking settings. Read with cmd 299,
 * written with cmd 300.
 *
 * Firmware: the cmd 299 handler (`nets_ai_cfg_get`) writes every field
 * except the two `smartTrackObject*Delay` fields, which it writes only when
 * the camera supports them. `smartTrackModeAbility` is written but never
 * read. `nets_param_ai_cfg_x2s` skips any field that is missing, so every
 * field is optional.
 *
 * @example Read the cmd 299 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { aiCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AiCfg version="1.1"><channelId>0</channelId><smartTrack>1</smartTrack>' +
 *     "<smartTrackMode>0</smartTrackMode>" +
 *     "<smartTrackModeAbility>3</smartTrackModeAbility>" +
 *     "<detectType>people,vehicle</detectType>" +
 *     "<smartTrackType>people</smartTrackType><smartTrackPt>0</smartTrackPt>" +
 *     "</AiCfg>",
 * ).root;
 *
 * assertEquals(aiCfg.decode(root).detectType, "people,vehicle");
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The AI settings in `<AiCfg>`. */
export type AiCfg = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 when smart tracking is on. */
  smartTrack?: number;
  /** Smart tracking mode as a number. */
  smartTrackMode?: number;
  /** Supported tracking modes; reply only, the camera never reads it. */
  smartTrackModeAbility?: number;
  /**
   * Objects to detect, comma-separated: any of `people`, `vehicle`, `face`,
   * `other` and `dog_cat`, or `none`.
   */
  detectType?: string;
  /**
   * Objects to track, comma-separated: any of `people`, `vehicle`, `face`
   * and `dog_cat`, or `none`.
   */
  smartTrackType?: string;
  /** Smart tracking point as a number. */
  smartTrackPt?: number;
  /** Delay after the object stops; written only when supported. */
  smartTrackObjectStopDelay?: number;
  /** Delay after the object disappears; written only when supported. */
  smartTrackObjectDisappearDelay?: number;
};

/**
 * Codec for `<AiCfg>`.
 *
 * @example Track people and vehicles
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { aiCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = aiCfg.encode({
 *   channelId: 0,
 *   smartTrack: 1,
 *   smartTrackType: "people,vehicle",
 * });
 *
 * assertStringIncludes(xml, "<smartTrackType>people,vehicle</smartTrackType>");
 * ```
 */
export const aiCfg: XmlParam<"AiCfg", AiCfg> = xmlParam("AiCfg", {
  channelId: optional(int()),
  smartTrack: optional(int()),
  smartTrackMode: optional(int()),
  smartTrackModeAbility: optional(int()),
  detectType: optional(text()),
  smartTrackType: optional(text()),
  smartTrackPt: optional(int()),
  smartTrackObjectStopDelay: optional(int()),
  smartTrackObjectDisappearDelay: optional(int()),
});
