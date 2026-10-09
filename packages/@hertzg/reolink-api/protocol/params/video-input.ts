/**
 * `<VideoInput>`: the image adjustments (brightness, contrast, saturation,
 * hue, sharpness). The camera pushes it unasked as cmd 78 when they change.
 *
 * Firmware: `nets_isp_base_s2x` writes every field, always; the cmd 78 push
 * builder writes the same fields except `sharpen`. The parser
 * `nets_isp_base_cfg_x2s` reads whichever fields are present, so none is
 * required.
 *
 * @example Read the cmd 78 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { videoInput } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<VideoInput version="1.1"><channelId>0</channelId><bright>128</bright>' +
 *     "<contrast>128</contrast><saturation>128</saturation><hue>128</hue>" +
 *     "</VideoInput>",
 * ).root;
 *
 * assertEquals(videoInput.decode(root).bright, 128);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The image adjustments in `<VideoInput>`. */
export type VideoInput = {
  /** Zero-based channel. */
  channelId?: number;
  /** Brightness, 0 to 255. */
  bright?: number;
  /** Contrast, 0 to 255. */
  contrast?: number;
  /** Saturation, 0 to 255. */
  saturation?: number;
  /** Hue, 0 to 255. */
  hue?: number;
  /** Sharpness, 0 to 255; missing from the cmd 78 push. */
  sharpen?: number;
};

/**
 * Codec for `<VideoInput>`.
 *
 * @example Build a `<VideoInput>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { videoInput } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = videoInput.encode({ channelId: 0, bright: 140, sharpen: 100 });
 *
 * assertStringIncludes(xml, "<bright>140</bright>");
 * ```
 */
export const videoInput: XmlParam<"VideoInput", VideoInput> = xmlParam(
  "VideoInput",
  {
    channelId: optional(int()),
    bright: optional(int()),
    contrast: optional(int()),
    saturation: optional(int()),
    hue: optional(int()),
    sharpen: optional(int()),
  },
);
