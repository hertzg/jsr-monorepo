/**
 * `<ReplaySeek>`: jumps a running playback to a point in time. Sent with
 * cmd 123.
 *
 * Firmware: `net_replay_seek_x2s` reads each field when present and skips
 * the rest; it rejects a negative `channelId`. Inside `seekTime` it rejects
 * a negative year, a month outside 1 to 12, a day outside 1 to 31, an hour
 * above 23, and a minute or second above 59. No serializer exists, so the camera
 * never writes this element.
 *
 * @example Build a cmd 123 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { replaySeek } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = replaySeek.encode({
 *   channelId: 0,
 *   seekTime: { year: 2026, month: 10, day: 9, hour: 14, minute: 30, second: 0 },
 *   seq: 1,
 * });
 *
 * assertStringIncludes(xml, "<seekTime><year>2026</year>");
 * ```
 *
 * @module
 */

import { int, obj, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The point in time to seek to, in `<seekTime>`. */
export type ReplaySeekTime = {
  /** Year, such as 2026. */
  year?: number;
  /** Month, 1 to 12. */
  month?: number;
  /** Day of the month, 1 to 31. */
  day?: number;
  /** Hour, 0 to 23. */
  hour?: number;
  /** Minute, 0 to 59. */
  minute?: number;
  /** Second, 0 to 59. */
  second?: number;
};

/** The playback seek request in `<ReplaySeek>`. */
export type ReplaySeek = {
  /** Zero-based channel. */
  channelId?: number;
  /** Where to seek to. */
  seekTime?: ReplaySeekTime;
  /** Sequence number of the request. */
  seq?: number;
};

/**
 * Codec for `<ReplaySeek>`.
 *
 * @example Read a `<ReplaySeek>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { replaySeek } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ReplaySeek version="1.1"><channelId>1</channelId>' +
 *     "<seekTime><hour>8</hour></seekTime></ReplaySeek>",
 * ).root;
 *
 * assertEquals(replaySeek.decode(root), { channelId: 1, seekTime: { hour: 8 } });
 * ```
 */
export const replaySeek: XmlParam<"ReplaySeek", ReplaySeek> = xmlParam(
  "ReplaySeek",
  {
    channelId: optional(int()),
    seekTime: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      hour: optional(int()),
      minute: optional(int()),
      second: optional(int()),
    })),
    seq: optional(int()),
  },
);
