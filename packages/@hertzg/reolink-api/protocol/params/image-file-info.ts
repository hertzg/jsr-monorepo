/**
 * `<imageFileInfo>`: an image file to import (cmd 420) or export (cmd 421).
 *
 * Firmware: the netserver handler for cmd 421 replies with `fileSize` only.
 * `nets_param_image_file_info_x2s` reads `channelId` (rejecting negative
 * values), `fileSize` (rejecting values below 1), `imageName` and `delete`
 * when present and skips the rest, so each field may be missing.
 *
 * @example Read the cmd 421 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { imageFileInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<imageFileInfo version="1.1"><fileSize>65536</fileSize></imageFileInfo>',
 * ).root;
 *
 * assertEquals(imageFileInfo.decode(root), { fileSize: 65536 });
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** An image file to import or export, in `<imageFileInfo>`. */
export type ImageFileInfo = {
  /** Zero-based channel; read from requests only. */
  channelId?: number;
  /** File size in bytes, 1 or more. */
  fileSize?: number;
  /** Image name, up to 255 characters; read from requests only. */
  imageName?: string;
  /** Delete flag as a number; read from requests only. */
  delete?: number;
};

/**
 * Codec for `<imageFileInfo>`.
 *
 * @example Announce an image to import
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { imageFileInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = imageFileInfo.encode({
 *   channelId: 0,
 *   fileSize: 65536,
 *   imageName: "guard.jpg",
 * });
 *
 * assertStringIncludes(xml, "<imageName>guard.jpg</imageName>");
 * ```
 */
export const imageFileInfo: XmlParam<"imageFileInfo", ImageFileInfo> = xmlParam(
  "imageFileInfo",
  {
    channelId: optional(int()),
    fileSize: optional(int()),
    imageName: optional(text()),
    delete: optional(int()),
  },
);
