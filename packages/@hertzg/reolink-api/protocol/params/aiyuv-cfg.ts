/**
 * `<AIYUVCfg>`: configures the raw YUV frame stream fed to AI detection.
 * Set with cmd 720 (`SET_AI_YUV_STREAM_CFG`) on the Video Doorbell PoE.
 *
 * Firmware: `net_ai_yuv_stream_cfg_x2s` reads whichever field is present
 * and does not range-check any of them. There is no serializer: the
 * element only appears in requests.
 *
 * @example Read a cmd 720 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { aiyuvCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   "<AIYUVCfg><needTLV>1</needTLV><gapms>200</gapms></AIYUVCfg>",
 * ).root;
 *
 * assertEquals(aiyuvCfg.decode(root), { needTLV: 1, gapms: 200 });
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The AI YUV stream settings in `<AIYUVCfg>`. */
export type AiyuvCfg = {
  /** Whether frames come wrapped in TLV records; values not established. */
  needTLV?: number;
  /** The gap between frames, in milliseconds by its name. */
  gapms?: number;
  /** Frame width in pixels. */
  resoWidth?: number;
  /** Frame height in pixels. */
  resoHeight?: number;
  /** The detection algorithm selector; values not established. */
  algorithm?: number;
};

/**
 * Codec for `<AIYUVCfg>`.
 *
 * @example Build a cmd 720 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { aiyuvCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = aiyuvCfg.encode({
 *   needTLV: 1,
 *   gapms: 100,
 *   resoWidth: 640,
 *   resoHeight: 360,
 *   algorithm: 0,
 * });
 *
 * assertStringIncludes(xml, "<resoWidth>640</resoWidth>");
 * ```
 */
export const aiyuvCfg: XmlParam<"AIYUVCfg", AiyuvCfg> = xmlParam("AIYUVCfg", {
  needTLV: optional(int()),
  gapms: optional(int()),
  resoWidth: optional(int()),
  resoHeight: optional(int()),
  algorithm: optional(int()),
});
