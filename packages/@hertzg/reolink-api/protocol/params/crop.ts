/**
 * `<Crop>`: the cropped region of the main stream, in main stream pixels.
 * Read with cmd 228, written with cmd 229.
 *
 * Firmware: the netserver cmd 228 handler writes every field, always.
 * `nets_param_crop_x2s` reads `channelId` (0 to 63), the region and the
 * main stream size, whichever are present, so every field is optional.
 * `subWidth`, `subHeight` and `<version>` are written but never read.
 *
 * @example Read a cmd 228 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { crop } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Crop version="1.1"><channelId>0</channelId><topLeftX>960</topLeftX>' +
 *     "<topLeftY>540</topLeftY><cropWidth>1920</cropWidth>" +
 *     "<cropHeight>1080</cropHeight><mainWidth>3840</mainWidth>" +
 *     "<mainHeight>2160</mainHeight><subHeight>360</subHeight>" +
 *     "<subWidth>640</subWidth><version>1</version></Crop>",
 * ).root;
 *
 * assertEquals(crop.decode(root).cropWidth, 1920);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The crop region in `<Crop>`. */
export type Crop = {
  /** Zero-based channel. */
  channelId?: number;
  /** Left edge of the region. */
  topLeftX?: number;
  /** Top edge of the region. */
  topLeftY?: number;
  /** Width of the region. */
  cropWidth?: number;
  /** Height of the region. */
  cropHeight?: number;
  /** Width of the main stream the region is measured in. */
  mainWidth?: number;
  /** Height of the main stream the region is measured in. */
  mainHeight?: number;
  /** Height of the sub stream; written only. */
  subHeight?: number;
  /** Width of the sub stream; written only. */
  subWidth?: number;
  /**
   * A `<version>` child element, not the `version="1.1"` attribute; written
   * only.
   */
  version?: number;
};

/**
 * Codec for `<Crop>`.
 *
 * @example Build a `<Crop>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { crop } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = crop.encode({
 *   channelId: 0,
 *   topLeftX: 0,
 *   topLeftY: 0,
 *   cropWidth: 1280,
 *   cropHeight: 720,
 *   mainWidth: 3840,
 *   mainHeight: 2160,
 * });
 *
 * assertStringIncludes(xml, "<cropWidth>1280</cropWidth><cropHeight>720</cropHeight>");
 * ```
 */
export const crop: XmlParam<"Crop", Crop> = xmlParam("Crop", {
  channelId: optional(int()),
  topLeftX: optional(int()),
  topLeftY: optional(int()),
  cropWidth: optional(int()),
  cropHeight: optional(int()),
  mainWidth: optional(int()),
  mainHeight: optional(int()),
  subHeight: optional(int()),
  subWidth: optional(int()),
  version: optional(int()),
});
