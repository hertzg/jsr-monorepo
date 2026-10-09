/**
 * `<findAlarmVideo>`: a search for alarm recordings on the Video Doorbell
 * PoE. Carried by cmds 272, 273 and 274 (`START_`, `DO_` and
 * `STOP_FIND_ALARM_VIDEO_V20`).
 *
 * Firmware: `net_find_alarm_video_x2s` reads whichever field is present. It
 * rejects a `channelId` above 63, a negative `fileHandle` and a
 * `streamType` above 7. It looks for the words `md`, `time_rec`,
 * `man_rec`, `people`, `face`, `vehicle`, `dog_cat`, `visitor`,
 * `package`, `talk` and `answer` anywhere in `alarmType`, ignoring case.
 * The cmd 272 reply, built in netserver, writes `channelId` and
 * `fileHandle` always.
 *
 * @example Read a cmd 272 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { findAlarmVideo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<findAlarmVideo version="1.1"><channelId>0</channelId>' +
 *     "<fileHandle>12</fileHandle></findAlarmVideo>",
 * ).root;
 *
 * assertEquals(findAlarmVideo.decode(root).fileHandle, 12);
 * ```
 *
 * @module
 */

import { int, obj, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** A point in time in `<startTime>` or `<endTime>` of `<findAlarmVideo>`. */
export type FindAlarmVideoTime = {
  /** Year; the parser rejects a negative one. */
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

/** The alarm recording search in `<findAlarmVideo>`. */
export type FindAlarmVideo = {
  /** Zero-based channel, 0 to 63. */
  channelId?: number;
  /** The search handle from cmd 272, used by cmds 273 and 274. */
  fileHandle?: number;
  /** Request only: stream type, 0 to 7. */
  streamType?: number;
  /** Request only: start of the search window. */
  startTime?: FindAlarmVideoTime;
  /** Request only: end of the search window. */
  endTime?: FindAlarmVideoTime;
  /**
   * Request only: the alarm kinds to find, as words such as `md`,
   * `people` or `visitor`. The firmware searches for each word in the
   * text, so a separator is not significant.
   */
  alarmType?: string;
};

/**
 * Codec for `<findAlarmVideo>`.
 *
 * @example Start a search for visitor recordings
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { findAlarmVideo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = findAlarmVideo.encode({
 *   channelId: 0,
 *   streamType: 0,
 *   startTime: { year: 2026, month: 10, day: 9, hour: 0, minute: 0, second: 0 },
 *   endTime: { year: 2026, month: 10, day: 9, hour: 23, minute: 59, second: 59 },
 *   alarmType: "visitor",
 * });
 *
 * assertStringIncludes(xml, "<alarmType>visitor</alarmType>");
 * ```
 */
export const findAlarmVideo: XmlParam<"findAlarmVideo", FindAlarmVideo> =
  xmlParam("findAlarmVideo", {
    channelId: optional(int()),
    fileHandle: optional(int()),
    streamType: optional(int()),
    startTime: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      hour: optional(int()),
      minute: optional(int()),
      second: optional(int()),
    })),
    endTime: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      hour: optional(int()),
      minute: optional(int()),
      second: optional(int()),
    })),
    alarmType: optional(text()),
  });
