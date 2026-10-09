/**
 * `<trackSchedule>`: the weekly schedule for AI tracking (cmd 436 reads it,
 * cmd 437 sets it).
 *
 * Firmware: `net_param_ai_track_task_s2x` writes both fields, always.
 * `net_param_ai_track_task_x2s` reads whichever fields are present and skips
 * the rest, so each one may be missing from a request.
 *
 * @example Read the cmd 436 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { trackSchedule } from "@hertzg/reolink-api/protocol/params";
 *
 * const timeTable = "1".repeat(168);
 * const root = parse(
 *   '<trackSchedule version="1.1"><channelId>0</channelId>' +
 *     `<timeTable>${timeTable}</timeTable></trackSchedule>`,
 * ).root;
 *
 * assertEquals(trackSchedule.decode(root).timeTable, timeTable);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The AI tracking schedule in `<trackSchedule>`. */
export type TrackSchedule = {
  /** Zero-based channel. */
  channelId?: number;
  /**
   * Schedule as text of up to 168 characters, stored as-is. The same field
   * in `<IOTAction>` holds one `0` or `1` per hour of the week.
   */
  timeTable?: string;
};

/**
 * Codec for `<trackSchedule>`.
 *
 * @example Set a schedule
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { trackSchedule } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = trackSchedule.encode({ channelId: 0, timeTable: "0".repeat(168) });
 *
 * assertStringIncludes(xml, "<channelId>0</channelId>");
 * ```
 */
export const trackSchedule: XmlParam<"trackSchedule", TrackSchedule> = xmlParam(
  "trackSchedule",
  {
    channelId: optional(int()),
    timeTable: optional(text()),
  },
);
