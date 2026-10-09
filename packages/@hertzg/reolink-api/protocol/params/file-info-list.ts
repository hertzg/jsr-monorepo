/**
 * `<FileInfoList>`: recorded files, as asked for and returned by the replay,
 * download and search commands (cmds 5, 7, 8, 9, 13, 14, 15, 16 and 143).
 *
 * Three firmware writers fill it, each with a different subset:
 *
 * ```
 * net_file_file_s2x       (search, one per file)  channelId handle name bdst Id?
 *                                                 streamType containsAudio fileType
 *                                                 recordType sizeL sizeH supportSub
 *                                                 startTime endTime
 * net_file_info_list_s2x  (one file)              the same minus bdst, Id, streamType
 * download cut reply      (one file)              sizeL sizeH FileCount
 * ```
 *
 * `_get_file_info` reads the first `<FileInfo>` of a request and requires
 * none of its fields, so every field is optional.
 *
 * @example Read a search reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { fileInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<FileInfoList version="1.1"><FileInfo><channelId>0</channelId>' +
 *     "<name>01202401011200000</name><recordType>md,people</recordType>" +
 *     "</FileInfo></FileInfoList>",
 * ).root;
 *
 * assertEquals(fileInfoList.decode(root).FileInfo[0].recordType, "md,people");
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
  uint,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A wall-clock time in a `<FileInfo>`, as the firmware writes it. */
export type FileInfoTime = {
  /** Four-digit year. */
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

/** The recorded files in `<FileInfoList>`. */
export type FileInfoList = {
  /** One entry per file; a search reply lists many, other replies one. */
  FileInfo: {
    /** Zero-based channel. */
    channelId?: number;
    /** Replay or download handle. */
    handle?: number;
    /** File name; the search reply derives it from channel and start time. */
    name?: string;
    /** Daylight-saving flag of the times. */
    bdst?: number;
    /** File id; written only when the camera has one. */
    Id?: string;
    /** Which encoder stream the file holds. */
    streamType?: "mainStream" | "subStream" | "mobileStream" | "externStream";
    /** 1 when the file has an audio track. */
    containsAudio?: number;
    /** Container format. */
    fileType?: "h264" | "mp4" | "flv";
    /**
     * Why it was recorded: `none`, or a comma-separated list of `manual`,
     * `io`, `md`, `pir`, `sched`, `people`, `vehicle`, `face`, `other` and
     * `dog_cat`.
     */
    recordType?: string;
    /** Low 32 bits of the file size in bytes. */
    sizeL?: number;
    /** High 32 bits of the file size in bytes. */
    sizeH?: number;
    /** 1 when a substream recording exists; the camera always writes 1. */
    supportSub?: number;
    /** Recording start. */
    startTime?: FileInfoTime;
    /** Recording end. */
    endTime?: FileInfoTime;
    /** Number of files a download cut produced. */
    FileCount?: number;
    /** Replay speed, 0 to 32; read from requests only. */
    playSpeed?: number;
  }[];
};

/**
 * Codec for `<FileInfoList>`.
 *
 * @example Build a replay request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { fileInfoList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = fileInfoList.encode({
 *   FileInfo: [{
 *     channelId: 0,
 *     handle: 1,
 *     name: "01202401011200000",
 *     streamType: "subStream",
 *     playSpeed: 1,
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<streamType>subStream</streamType>");
 * ```
 */
export const fileInfoList: XmlParam<"FileInfoList", FileInfoList> = xmlParam(
  "FileInfoList",
  {
    FileInfo: repeated(obj({
      channelId: optional(int()),
      handle: optional(int()),
      name: optional(text()),
      bdst: optional(int()),
      Id: optional(text()),
      streamType: optional(
        oneOf("mainStream", "subStream", "mobileStream", "externStream"),
      ),
      containsAudio: optional(int()),
      fileType: optional(oneOf("h264", "mp4", "flv")),
      recordType: optional(text()),
      sizeL: optional(uint()),
      sizeH: optional(uint()),
      supportSub: optional(int()),
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
      FileCount: optional(uint()),
      playSpeed: optional(int()),
    })),
  },
);
