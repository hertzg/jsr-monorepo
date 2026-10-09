/**
 * `<ReplayByTimeV2>`: starts or stops playback of a time range. Sent with
 * cmd 381 (start) and cmd 382 (stop).
 *
 * Firmware (Video Doorbell PoE): `nets_param_new_replay_start_x2s` reads
 * each field when present and skips the rest. It rejects a `playSpeed`
 * above 32. It reads an unknown `streamType` as `mainStream`. Inside a
 * time it rejects a negative year, a month outside 1 to 12, a day outside
 * 1 to 31, an hour above 23 and a minute or second above 59. It keeps up
 * to 4 `<duration>` items in `durationList` and up to 100 `<i>` periods in
 * each. No serializer exists, so the camera never writes this element.
 *
 * @example Build a cmd 381 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { replayByTimeV2 } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = replayByTimeV2.encode({
 *   seq: 1,
 *   streamType: "mainStream",
 *   playSpeed: 1,
 *   startTime: { year: 2026, month: 10, day: 9, hour: 8, minute: 0, second: 0 },
 *   endTime: { year: 2026, month: 10, day: 9, hour: 9, minute: 0, second: 0 },
 * });
 *
 * assertStringIncludes(xml, "<streamType>mainStream</streamType>");
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  oneOf,
  optional,
  repeated,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A date and time in `<ReplayByTimeV2>`. */
export type ReplayByTimeV2Time = {
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

/** One recorded period, an `<i>` in `<times>`. */
export type ReplayByTimeV2Period = {
  /** Start, in seconds since midnight; must not be negative. */
  s?: number;
  /** End, in seconds since midnight; must not be negative. */
  e?: number;
};

/** The recorded periods of one channel, a `<duration>` in `<durationList>`. */
export type ReplayByTimeV2Duration = {
  /** Zero-based channel; must not be negative. */
  channelId?: number;
  /** The periods, as `<i>` items; up to 100 are read. */
  times?: ReplayByTimeV2Period[];
};

/** The recorded periods of one day, in `<durationList>`. */
export type ReplayByTimeV2DurationList = {
  /** Year, 0 or more. */
  year?: number;
  /** Month, 1 to 12. */
  month?: number;
  /** Day of the month, 1 to 31. */
  day?: number;
  /** One `<duration>` per channel; up to 4 are read. */
  duration: ReplayByTimeV2Duration[];
};

/** The playback request in `<ReplayByTimeV2>`. */
export type ReplayByTimeV2 = {
  /** Sequence number of the request. */
  seq?: number;
  /** The stream to play; an unknown name reads as `mainStream`. */
  streamType?: "mainStream" | "subStream" | "mobileStream" | "externStream";
  /** Playback speed, 0 to 32. */
  playSpeed?: number;
  /** Start of the range. */
  startTime?: ReplayByTimeV2Time;
  /** End of the range. */
  endTime?: ReplayByTimeV2Time;
  /** The recorded periods to play. */
  durationList?: ReplayByTimeV2DurationList;
};

function time() {
  return obj({
    year: optional(int()),
    month: optional(int()),
    day: optional(int()),
    hour: optional(int()),
    minute: optional(int()),
    second: optional(int()),
  });
}

/**
 * Codec for `<ReplayByTimeV2>`.
 *
 * @example Read a `<ReplayByTimeV2>` element with recorded periods
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { replayByTimeV2 } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ReplayByTimeV2 version="1.1"><seq>2</seq><durationList>' +
 *     "<year>2026</year><month>10</month><day>9</day>" +
 *     "<duration><channelId>0</channelId><times><i><s>3600</s><e>7200</e></i>" +
 *     "</times></duration></durationList></ReplayByTimeV2>",
 * ).root;
 *
 * assertEquals(replayByTimeV2.decode(root).durationList?.duration, [
 *   { channelId: 0, times: [{ s: 3600, e: 7200 }] },
 * ]);
 * ```
 */
export const replayByTimeV2: XmlParam<"ReplayByTimeV2", ReplayByTimeV2> =
  xmlParam("ReplayByTimeV2", {
    seq: optional(int()),
    streamType: optional(
      oneOf("mainStream", "subStream", "mobileStream", "externStream"),
    ),
    playSpeed: optional(int()),
    startTime: optional(time()),
    endTime: optional(time()),
    durationList: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      duration: repeated(obj({
        channelId: optional(int()),
        times: optional(list(
          "i",
          obj({ s: optional(int()), e: optional(int()) }),
        )),
      })),
    })),
  });
