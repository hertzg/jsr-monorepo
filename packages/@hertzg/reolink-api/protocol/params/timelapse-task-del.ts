/**
 * `<timelapseTaskDel>`: a timelapse task to delete (cmd 329), named by the
 * device uid and the task id.
 *
 * Firmware: `net_timelapse_task_delete_s2x` writes both fields, always.
 * `net_timelapse_task_delete_x2s` reads whichever fields are present and
 * skips the rest, so each one may be missing from a request.
 *
 * @example Read the cmd 329 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseTaskDel } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseTaskDel version="1.1"><uid>95270000ABCDEF12</uid>' +
 *     "<id>20240501_1200</id></timelapseTaskDel>",
 * ).root;
 *
 * assertEquals(timelapseTaskDel.decode(root).id, "20240501_1200");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** A timelapse task to delete, in `<timelapseTaskDel>`. */
export type TimelapseTaskDel = {
  /** Device uid, up to 31 characters. */
  uid?: string;
  /** Timelapse task id, up to 31 characters. */
  id?: string;
};

/**
 * Codec for `<timelapseTaskDel>`.
 *
 * @example Delete a timelapse task
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { timelapseTaskDel } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = timelapseTaskDel.encode({
 *   uid: "95270000ABCDEF12",
 *   id: "20240501_1200",
 * });
 *
 * assertStringIncludes(xml, "<id>20240501_1200</id>");
 * ```
 */
export const timelapseTaskDel: XmlParam<"timelapseTaskDel", TimelapseTaskDel> =
  xmlParam("timelapseTaskDel", {
    uid: optional(text()),
    id: optional(text()),
  });
