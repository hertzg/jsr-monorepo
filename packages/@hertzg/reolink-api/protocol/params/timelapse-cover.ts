/**
 * `<timelapseCover>`: names the time-lapse file whose cover image to fetch
 * with cmd 326.
 *
 * Firmware: `net_timelapse_file_cover_s2x` writes `id`, always.
 * `net_timelapse_file_cover_x2s` skips it when missing, so it is optional.
 *
 * @example Read a `<timelapseCover>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseCover } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseCover version="1.1"><id>file-1</id></timelapseCover>',
 * ).root;
 *
 * assertEquals(timelapseCover.decode(root).id, "file-1");
 * ```
 *
 * @module
 */

import { optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The file reference in `<timelapseCover>`. */
export type TimelapseCover = {
  /** File id, as listed by cmd 323 and 324. */
  id?: string;
};

/**
 * Codec for `<timelapseCover>`.
 *
 * @example Build the cmd 326 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { timelapseCover } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   timelapseCover.encode({ id: "file-1" }),
 *   '<timelapseCover version="1.1"><id>file-1</id></timelapseCover>',
 * );
 * ```
 */
export const timelapseCover: XmlParam<"timelapseCover", TimelapseCover> =
  xmlParam("timelapseCover", {
    id: optional(text()),
  });
