/**
 * `<timelapseDateTbl>`: the days on which a time-lapse task has files.
 * Read with cmd 322.
 *
 * Firmware: `net_timelapse_date_s2x` writes `channelId`, `uid` and `id`,
 * then one `<item>` per year directly under `<timelapseDateTbl>`, each with
 * `year` and `dateTable`. `net_timelapse_date_x2s` reads the same fields
 * and up to 10 items, skipping any field that is missing, so every field
 * is optional. The format of `dateTable` is not visible in this code.
 *
 * @example Read the cmd 322 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseDateTbl } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseDateTbl version="1.1"><channelId>0</channelId><uid>disk-1</uid>' +
 *     "<id>task-1</id><item><year>2026</year><dateTable>0101</dateTable></item>" +
 *     "</timelapseDateTbl>",
 * ).root;
 *
 * assertEquals(timelapseDateTbl.decode(root).item?.[0].year, 2026);
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One year in `<timelapseDateTbl>`. */
export type TimelapseDateTblItem = {
  /** Year, such as 2026. */
  year?: number;
  /** The days of that year with files, as text. */
  dateTable?: string;
};

/** The days with time-lapse files in `<timelapseDateTbl>`. */
export type TimelapseDateTbl = {
  /** Zero-based channel. */
  channelId?: number;
  /** Storage UID. */
  uid?: string;
  /** Task id. */
  id?: string;
  /** One entry per year, as repeated `<item>` elements. */
  item?: TimelapseDateTblItem[];
};

/**
 * Codec for `<timelapseDateTbl>`.
 *
 * @example Build the cmd 322 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { timelapseDateTbl } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   timelapseDateTbl.encode({ channelId: 0, id: "task-1" }),
 *   '<timelapseDateTbl version="1.1"><channelId>0</channelId><id>task-1</id>' +
 *     "</timelapseDateTbl>",
 * );
 * ```
 */
export const timelapseDateTbl: XmlParam<"timelapseDateTbl", TimelapseDateTbl> =
  xmlParam("timelapseDateTbl", {
    channelId: optional(int()),
    uid: optional(text()),
    id: optional(text()),
    item: optional(repeated(obj({
      year: optional(int()),
      dateTable: optional(text()),
    }))),
  });
