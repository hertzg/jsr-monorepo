/**
 * `<DayRecords>`: which days in a time range have recordings, per channel.
 * cmd 142 sends the range and channels; the reply fills in the days.
 *
 * Firmware: `net_day_rec_s2x` always writes `startTime`, `endTime` and
 * `DayRecordList` (up to 4 channels), and every field inside them; a day
 * without recordings gets no `<dayType>`. `net_day_rec_x2s` reads each
 * top-level field when present and skips the rest, and in a `<DayRecord>`
 * reads only `channelId` and `dayTypeList`. A `<dayType>` must carry both
 * `index` (0 to 30) and `type`, and nothing but `<dayType>` may sit in a
 * `<dayTypeList>`.
 *
 * @example Read the cmd 142 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dayRecords } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<DayRecords version="1.1">' +
 *     "<startTime><year>2026</year><month>10</month><day>1</day>" +
 *     "<hour>0</hour><minute>0</minute><second>0</second></startTime>" +
 *     "<endTime><year>2026</year><month>10</month><day>31</day>" +
 *     "<hour>23</hour><minute>59</minute><second>59</second></endTime>" +
 *     "<DayRecordList><DayRecord><index>0</index><channelId>0</channelId>" +
 *     "<dayTypeList><dayType><index>8</index><type>alarm</type></dayType>" +
 *     "</dayTypeList></DayRecord></DayRecordList></DayRecords>",
 * ).root;
 *
 * assertEquals(
 *   dayRecords.decode(root).DayRecordList?.[0].dayTypeList?.[0].type,
 *   "alarm",
 * );
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
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A point in time in `<startTime>` or `<endTime>`. */
export type DayRecordsTime = {
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

/** One day with recordings, in `<dayType>`. */
export type DayRecordsDayType = {
  /** Zero-based day offset, 0 to 30. */
  index: number;
  /** What was recorded; the camera never writes `none`. */
  type: "none" | "normal" | "alarm" | "all";
};

/** One channel's days, in `<DayRecord>`. */
export type DayRecordsChannel = {
  /** Position in the list; written only, never parsed. */
  index?: number;
  /** Zero-based channel. */
  channelId?: number;
  /** The days with recordings. */
  dayTypeList?: DayRecordsDayType[];
};

/** The recording calendar in `<DayRecords>`. */
export type DayRecords = {
  /** Start of the range. */
  startTime?: DayRecordsTime;
  /** End of the range. */
  endTime?: DayRecordsTime;
  /** One entry per channel, at most 4. */
  DayRecordList?: DayRecordsChannel[];
};

/**
 * Codec for `<DayRecords>`.
 *
 * @example Build a cmd 142 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { dayRecords } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = dayRecords.encode({
 *   startTime: { year: 2026, month: 10, day: 1, hour: 0, minute: 0, second: 0 },
 *   endTime: { year: 2026, month: 10, day: 31, hour: 23, minute: 59, second: 59 },
 *   DayRecordList: [{ channelId: 0 }],
 * });
 *
 * assertStringIncludes(
 *   xml,
 *   "<DayRecordList><DayRecord><channelId>0</channelId></DayRecord></DayRecordList>",
 * );
 * ```
 */
export const dayRecords: XmlParam<"DayRecords", DayRecords> = xmlParam(
  "DayRecords",
  {
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
    DayRecordList: optional(list(
      "DayRecord",
      obj({
        index: optional(int()),
        channelId: optional(int()),
        dayTypeList: optional(list(
          "dayType",
          obj({
            index: int(),
            type: oneOf("none", "normal", "alarm", "all"),
          }),
        )),
      }),
    )),
  },
);
