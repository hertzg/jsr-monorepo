/**
 * `<timelapseFileDel>`: timelapse files to delete (cmd 330), as repeated
 * `<item>` elements each holding a file id.
 *
 * Firmware: `net_timelapse_file_delete_s2x` writes one `<item><id>` per file,
 * at most 40, and nothing else. `net_timelapse_file_delete_x2s` also reads a
 * `<taskType>`, accepts up to 128 items, and skips any field that is missing.
 *
 * @example Read the cmd 330 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseFileDel } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseFileDel version="1.1"><item><id>0001.jpg</id></item>' +
 *     "<item><id>0002.jpg</id></item></timelapseFileDel>",
 * ).root;
 *
 * assertEquals(timelapseFileDel.decode(root).item.length, 2);
 * ```
 *
 * @module
 */

import {
  obj,
  oneOf,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** Timelapse files to delete, in `<timelapseFileDel>`. */
export type TimelapseFileDel = {
  /** Media type of the files; read from requests, never written in replies. */
  taskType?: "mp4" | "jpeg";
  /** The files, one `<item>` each. */
  item: {
    /** File id, up to 255 characters. */
    id?: string;
  }[];
};

/**
 * Codec for `<timelapseFileDel>`.
 *
 * @example Delete two JPEG frames
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { timelapseFileDel } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = timelapseFileDel.encode({
 *   taskType: "jpeg",
 *   item: [{ id: "0001.jpg" }, { id: "0002.jpg" }],
 * });
 *
 * assertStringIncludes(xml, "<item><id>0002.jpg</id></item>");
 * ```
 */
export const timelapseFileDel: XmlParam<"timelapseFileDel", TimelapseFileDel> =
  xmlParam("timelapseFileDel", {
    taskType: optional(oneOf("mp4", "jpeg")),
    item: repeated(obj({ id: optional(text()) })),
  });
