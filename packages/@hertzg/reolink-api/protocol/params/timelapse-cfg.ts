/**
 * `<timelapseCfg>`: the time-lapse task of a channel. Read with cmd 319,
 * written with cmd 320.
 *
 * Firmware: `net_timelapse_cfg_s2x` writes `channelId`, `overwrite` and
 * `maxFileNum`, then one `<item>` only when a task exists. The item holds
 * the task's date range, four daily `<duration>` windows, and its options.
 * `net_timelapse_cfg_x2s` reads at most one `<item>` and four `<duration>`,
 * and skips any field that is missing, so every field is optional. It
 * rejects a `taskType` or `streamType` outside the names it maps, and the
 * serializer fails on one too.
 *
 * @example Read the cmd 319 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseCfg version="1.1"><channelId>0</channelId>' +
 *     "<overwrite>1</overwrite><maxFileNum>32</maxFileNum>" +
 *     "<item><enable>1</enable><interval>60</interval>" +
 *     "<streamType>mainStream</streamType><taskType>mp4</taskType>" +
 *     "<id>task-1</id></item></timelapseCfg>",
 * ).root;
 *
 * assertEquals(timelapseCfg.decode(root).item?.interval, 60);
 * ```
 *
 * @module
 */

import {
  int,
  obj,
  oneOf,
  optional,
  repeated,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/**
 * A date and time in `<timelapseCfg>`. The item's range is written with
 * `year` to `minute`, a duration window with `hour` to `second`.
 */
export type TimelapseCfgTime = {
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

/** A daily capture window in a `<timelapseCfg>` item. */
export type TimelapseCfgDuration = {
  /** 1 when the window is in use. */
  valid?: number;
  /** Window start. */
  startTime?: TimelapseCfgTime;
  /** Window end. */
  endTime?: TimelapseCfgTime;
};

/** The time-lapse task in `<timelapseCfg>`. */
export type TimelapseCfgItem = {
  /** First day of the task. */
  startTime?: TimelapseCfgTime;
  /** Last day of the task. */
  endTime?: TimelapseCfgTime;
  /** Daily capture windows; the firmware writes and reads up to four. */
  duration?: TimelapseCfgDuration[];
  /** 1 when the task runs. */
  enable?: number;
  /** 1 when the task has no end date. */
  neverEnd?: number;
  /** Frame rate of the resulting video. */
  frameRate?: number;
  /** 1 when thumbnails are kept. */
  buseThumbnail?: number;
  /** Capture interval. */
  interval?: number;
  /** The stream to capture from. */
  streamType?: "mainStream" | "subStream" | "mobileStream" | "externStream";
  /** Output format. */
  taskType?: "mp4" | "jpeg";
  /** Task id. */
  id?: string;
  /** Free-form task properties. */
  properties?: string;
};

/** The time-lapse settings in `<timelapseCfg>`. */
export type TimelapseCfg = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 when old files are overwritten. */
  overwrite?: number;
  /** Most files kept; reply only, the camera never reads it. */
  maxFileNum?: number;
  /** The task; written only when one exists. */
  item?: TimelapseCfgItem;
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
 * Codec for `<timelapseCfg>`.
 *
 * @example Build a daily mp4 task
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { timelapseCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = timelapseCfg.encode({
 *   channelId: 0,
 *   item: {
 *     duration: [{
 *       valid: 1,
 *       startTime: { hour: 6, minute: 0, second: 0 },
 *       endTime: { hour: 18, minute: 0, second: 0 },
 *     }],
 *     enable: 1,
 *     neverEnd: 1,
 *     interval: 60,
 *     streamType: "mainStream",
 *     taskType: "mp4",
 *   },
 * });
 *
 * assertStringIncludes(xml, "<duration><valid>1</valid><startTime><hour>6</hour>");
 * ```
 */
export const timelapseCfg: XmlParam<"timelapseCfg", TimelapseCfg> = xmlParam(
  "timelapseCfg",
  {
    channelId: optional(int()),
    overwrite: optional(int()),
    maxFileNum: optional(int()),
    item: optional(obj({
      startTime: optional(time()),
      endTime: optional(time()),
      duration: optional(repeated(obj({
        valid: optional(int()),
        startTime: optional(time()),
        endTime: optional(time()),
      }))),
      enable: optional(int()),
      neverEnd: optional(int()),
      frameRate: optional(int()),
      buseThumbnail: optional(int()),
      interval: optional(int()),
      streamType: optional(
        oneOf("mainStream", "subStream", "mobileStream", "externStream"),
      ),
      taskType: optional(oneOf("mp4", "jpeg")),
      id: optional(text()),
      properties: optional(text()),
    })),
  },
);
