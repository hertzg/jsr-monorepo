/**
 * `<ReplaySeekV2>`: jumps a running time-range playback to a point in time.
 * Sent with cmd 383.
 *
 * Firmware (Video Doorbell PoE): `nets_param_new_replay_seek_x2s` reads
 * `seekTime`, `seq` and `durationList` when present and skips the rest.
 * Inside a time it rejects a negative year, a month outside 1 to 12, a day
 * outside 1 to 31, an hour above 23 and a minute or second above 59. It
 * keeps up to 4 `<duration>` items in `durationList` and up to 100 `<i>`
 * periods in each. No serializer exists, so the camera never writes this
 * element.
 *
 * @example Build a cmd 383 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { replaySeekV2 } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = replaySeekV2.encode({
 *   seekTime: { year: 2026, month: 10, day: 9, hour: 14, minute: 30, second: 0 },
 *   seq: 1,
 * });
 *
 * assertStringIncludes(xml, "<seekTime><year>2026</year>");
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  optional,
  repeated,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** The point in time to seek to, in `<seekTime>`. */
export type ReplaySeekV2Time = {
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
export type ReplaySeekV2Period = {
  /** Start, in seconds since midnight; must not be negative. */
  s?: number;
  /** End, in seconds since midnight; must not be negative. */
  e?: number;
};

/** The recorded periods of one channel, a `<duration>` in `<durationList>`. */
export type ReplaySeekV2Duration = {
  /** Zero-based channel; must not be negative. */
  channelId?: number;
  /** The periods, as `<i>` items; up to 100 are read. */
  times?: ReplaySeekV2Period[];
};

/** The recorded periods of one day, in `<durationList>`. */
export type ReplaySeekV2DurationList = {
  /** Year, 0 or more. */
  year?: number;
  /** Month, 1 to 12. */
  month?: number;
  /** Day of the month, 1 to 31. */
  day?: number;
  /** One `<duration>` per channel; up to 4 are read. */
  duration: ReplaySeekV2Duration[];
};

/** The playback seek request in `<ReplaySeekV2>`. */
export type ReplaySeekV2 = {
  /** Where to seek to. */
  seekTime?: ReplaySeekV2Time;
  /** Sequence number of the request. */
  seq?: number;
  /** The recorded periods being played. */
  durationList?: ReplaySeekV2DurationList;
};

/**
 * Codec for `<ReplaySeekV2>`.
 *
 * @example Read a `<ReplaySeekV2>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { replaySeekV2 } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ReplaySeekV2 version="1.1"><seekTime><hour>8</hour></seekTime>' +
 *     "<seq>3</seq></ReplaySeekV2>",
 * ).root;
 *
 * assertEquals(replaySeekV2.decode(root), { seekTime: { hour: 8 }, seq: 3 });
 * ```
 */
export const replaySeekV2: XmlParam<"ReplaySeekV2", ReplaySeekV2> = xmlParam(
  "ReplaySeekV2",
  {
    seekTime: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      hour: optional(int()),
      minute: optional(int()),
      second: optional(int()),
    })),
    seq: optional(int()),
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
  },
);
