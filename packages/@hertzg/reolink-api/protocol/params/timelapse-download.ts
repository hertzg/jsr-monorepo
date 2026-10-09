/**
 * `<timelapseDownload>`: one timelapse file to download (cmd 327), named by
 * its task id and media type, with a byte position to resume from.
 *
 * Firmware: `net_timelapse_download_s2x` writes every field, always.
 * `net_timelapse_download_x2s` reads whichever fields are present and skips
 * the rest, so each one may be missing from a request.
 *
 * @example Read the cmd 327 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseDownload } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseDownload version="1.1"><position>0</position>' +
 *     "<id>20240501_1200</id><taskType>mp4</taskType></timelapseDownload>",
 * ).root;
 *
 * assertEquals(timelapseDownload.decode(root).taskType, "mp4");
 * ```
 *
 * @module
 */

import { oneOf, optional, text, u64, type XmlParam, xmlParam } from "../xml.ts";

/** One timelapse file to download, in `<timelapseDownload>`. */
export type TimelapseDownload = {
  /** Byte offset into the file to start from. */
  position?: bigint;
  /** Timelapse task id, up to 255 characters. */
  id?: string;
  /** Media type: a video or a JPEG sequence. */
  taskType?: "mp4" | "jpeg";
};

/**
 * Codec for `<timelapseDownload>`.
 *
 * @example Ask for a JPEG timelapse from the start
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { timelapseDownload } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = timelapseDownload.encode({
 *   position: 0n,
 *   id: "20240501_1200",
 *   taskType: "jpeg",
 * });
 *
 * assertStringIncludes(xml, "<taskType>jpeg</taskType>");
 * ```
 */
export const timelapseDownload: XmlParam<
  "timelapseDownload",
  TimelapseDownload
> = xmlParam("timelapseDownload", {
  position: optional(u64()),
  id: optional(text()),
  taskType: optional(oneOf("mp4", "jpeg")),
});
