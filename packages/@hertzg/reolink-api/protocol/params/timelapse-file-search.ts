/**
 * `<timelapseFileSearch>`: a search through a time-lapse task's files.
 * Opened with cmd 323, paged with cmd 324, closed with cmd 325.
 *
 * Firmware: `net_timelapse_file_s2x` writes `channelId`, `handle`,
 * `totalNum`, `finished`, `uid`, `id` and `taskType`, then one `<item>` per
 * file directly under `<timelapseFileSearch>`. For an mp4 task an item
 * holds `<original>` with the video's times and `duration`; for a jpeg
 * task it holds `<original>` and `<thumbnail>`, each only when present.
 * `net_timelapse_file_x2s` also reads `fromWhere`, `startTime` and
 * `endTime` (the search window), and skips any field that is missing, so
 * every field is optional. It reads items in a flat shape (`resoWidth`,
 * `size`, `fileName` directly in `<item>`) that the serializer never
 * writes; this codec models only the shape the camera writes.
 *
 * @example Read a cmd 324 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseFileSearch } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseFileSearch version="1.1"><channelId>0</channelId>' +
 *     "<handle>7</handle><totalNum>1</totalNum><finished>1</finished>" +
 *     "<uid>disk-1</uid><id>task-1</id><taskType>jpeg</taskType>" +
 *     "<item><original><id>img-1</id><fileName>a.jpg</fileName>" +
 *     "<resoHight>2160</resoHight><resowidth>3840</resowidth>" +
 *     "<size>1048576</size></original></item></timelapseFileSearch>",
 * ).root;
 *
 * assertEquals(timelapseFileSearch.decode(root).item?.[0].original?.size, 1048576n);
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
  u64,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A date and time in `<timelapseFileSearch>`. */
export type TimelapseFileTime = {
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

/** One stored file in a `<timelapseFileSearch>` item. */
export type TimelapseFile = {
  /** File id. */
  id?: string;
  /** File name. */
  fileName?: string;
  /** Height in pixels; the firmware spells it `resoHight`. */
  resoHight?: number;
  /** Width in pixels; the firmware spells it `resowidth`. */
  resowidth?: number;
  /** Size in bytes. */
  size?: bigint;
  /** Video length; written for mp4 only. */
  duration?: number;
  /** Video start; written for mp4 only. */
  startTime?: TimelapseFileTime;
  /** Video end; written for mp4 only. */
  endTime?: TimelapseFileTime;
};

/** One result in `<timelapseFileSearch>`. */
export type TimelapseFileItem = {
  /** The full file. */
  original?: TimelapseFile;
  /** The thumbnail; written for jpeg tasks only. */
  thumbnail?: TimelapseFile;
};

/** The search state and results in `<timelapseFileSearch>`. */
export type TimelapseFileSearch = {
  /** Zero-based channel. */
  channelId?: number;
  /** Search handle from cmd 323, passed to cmd 324 and 325. */
  handle?: number;
  /** Number of files found. */
  totalNum?: number;
  /** 1 when no more pages follow. */
  finished?: number;
  /** Storage UID. */
  uid?: string;
  /** Task id. */
  id?: string;
  /** Where to search, as a number; read only, never written back. */
  fromWhere?: number;
  /** Start of the search window; read only, never written back. */
  startTime?: TimelapseFileTime;
  /** End of the search window; read only, never written back. */
  endTime?: TimelapseFileTime;
  /** Output format of the task. */
  taskType?: "mp4" | "jpeg";
  /** One entry per file, as repeated `<item>` elements. */
  item?: TimelapseFileItem[];
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

function file() {
  return obj({
    id: optional(text()),
    fileName: optional(text()),
    resoHight: optional(int()),
    resowidth: optional(int()),
    size: optional(u64()),
    duration: optional(int()),
    startTime: optional(time()),
    endTime: optional(time()),
  });
}

/**
 * Codec for `<timelapseFileSearch>`.
 *
 * @example Open a search over one day
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { timelapseFileSearch } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = timelapseFileSearch.encode({
 *   channelId: 0,
 *   id: "task-1",
 *   startTime: { year: 2026, month: 10, day: 9, hour: 0, minute: 0, second: 0 },
 *   endTime: { year: 2026, month: 10, day: 9, hour: 23, minute: 59, second: 59 },
 *   taskType: "mp4",
 * });
 *
 * assertStringIncludes(xml, "<startTime><year>2026</year>");
 * ```
 */
export const timelapseFileSearch: XmlParam<
  "timelapseFileSearch",
  TimelapseFileSearch
> = xmlParam("timelapseFileSearch", {
  channelId: optional(int()),
  handle: optional(int()),
  totalNum: optional(int()),
  finished: optional(int()),
  uid: optional(text()),
  id: optional(text()),
  fromWhere: optional(int()),
  startTime: optional(time()),
  endTime: optional(time()),
  taskType: optional(oneOf("mp4", "jpeg")),
  item: optional(repeated(obj({
    original: optional(file()),
    thumbnail: optional(file()),
  }))),
});
