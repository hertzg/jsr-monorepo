/**
 * `<Preview>`: which live stream to start (cmd 3) or stop (cmd 4).
 *
 * Firmware: `net_preview_x2s` reads every field as optional. `channelId`
 * must not be negative. `streamType` maps the four names below and treats
 * any other text as `mainStream`. No serializer for it was found, so the
 * shape is the request the camera accepts.
 *
 * @example Read a preview request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { preview } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Preview version="1.1"><channelId>0</channelId><handle>0</handle>' +
 *     "<streamType>subStream</streamType></Preview>",
 * ).root;
 *
 * assertEquals(preview.decode(root).streamType, "subStream");
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The live stream selection in `<Preview>`. */
export type Preview = {
  /** Zero-based channel. */
  channelId?: number;
  /** Client-chosen stream handle. */
  handle?: number;
  /**
   * Which encoder stream to send. `aiYuvData` (raw frames for AI) is Video
   * Doorbell PoE only.
   */
  streamType?:
    | "mainStream"
    | "subStream"
    | "mobileStream"
    | "externStream"
    | "aiYuvData";
  /** Pre-record setting. */
  preRec?: number;
  /** Resolution selector. */
  resolution?: number;
  /** Frame rate. */
  fps?: number;
  /** For `aiYuvData`: 1 to wrap frames in TLV records. Video Doorbell PoE only. */
  needTLV?: number;
  /** For `aiYuvData`: gap between frames, in milliseconds. Video Doorbell PoE only. */
  gapms?: number;
  /** For `aiYuvData`: frame width. Video Doorbell PoE only. */
  resoWidth?: number;
  /** For `aiYuvData`: frame height. Video Doorbell PoE only. */
  resoHeight?: number;
  /** For `aiYuvData`: algorithm selector; values not recovered. Video Doorbell PoE only. */
  algorithm?: number;
};

/**
 * Codec for `<Preview>`.
 *
 * @example Build a `<Preview>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { preview } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = preview.encode({
 *   channelId: 0,
 *   handle: 0,
 *   streamType: "mainStream",
 * });
 *
 * assertStringIncludes(xml, "<streamType>mainStream</streamType>");
 * ```
 */
export const preview: XmlParam<"Preview", Preview> = xmlParam("Preview", {
  channelId: optional(int()),
  handle: optional(int()),
  streamType: optional(
    oneOf(
      "mainStream",
      "subStream",
      "mobileStream",
      "externStream",
      "aiYuvData",
    ),
  ),
  preRec: optional(int()),
  resolution: optional(int()),
  fps: optional(int()),
  needTLV: optional(int()),
  gapms: optional(int()),
  resoWidth: optional(int()),
  resoHeight: optional(int()),
  algorithm: optional(int()),
});
