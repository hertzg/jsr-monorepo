/**
 * `<alarmVideoInfo>`: one page of alarm recordings found by a search, in
 * the doorbell's cmd 273 reply. The request names `<findAlarmVideo>`, but
 * the reply carries this element instead.
 *
 * Firmware (Video Doorbell PoE): the cmd 273 handler writes `channelId`,
 * `fileHandle`, `bFinished` and `alarmVideoList`, always, with one
 * `<alarmVideo>` per recording. Each recording always has every field
 * except `typeExtension`, which is written only for two internal file
 * kinds.
 *
 * @example Read the cmd 273 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { alarmVideoInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<alarmVideoInfo version="1.1"><channelId>0</channelId>' +
 *     "<fileHandle>7</fileHandle><bFinished>1</bFinished><alarmVideoList>" +
 *     "<alarmVideo><fileName>0120250314081502</fileName>" +
 *     "<alarmType>visitor</alarmType><fileId>Rec_20250314_081502</fileId>" +
 *     "<startTime><year>2025</year><month>3</month><day>14</day>" +
 *     "<hour>8</hour><minute>15</minute><second>2</second></startTime>" +
 *     "<endTime><year>2025</year><month>3</month><day>14</day>" +
 *     "<hour>8</hour><minute>15</minute><second>31</second></endTime>" +
 *     "</alarmVideo></alarmVideoList></alarmVideoInfo>",
 * ).root;
 *
 * assertEquals(alarmVideoInfo.decode(root).alarmVideoList[0].alarmType, "visitor");
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  optional,
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A point in time in `<startTime>` or `<endTime>` of `<alarmVideo>`. */
export type AlarmVideoInfoTime = {
  /** Year. */
  year: number;
  /** Month. */
  month: number;
  /** Day of the month. */
  day: number;
  /** Hour. */
  hour: number;
  /** Minute. */
  minute: number;
  /** Second. */
  second: number;
};

/** One recording, an `<alarmVideo>` in `<alarmVideoList>`. */
export type AlarmVideoInfoItem = {
  /** Name built as two digits followed by a 14-digit date and time. */
  fileName: string;
  /**
   * What triggered the recording: `md`, `people`, `face`, `vehicle`,
   * `dog_cat`, `visitor`, `package`, `io`, `man_rec`, `time_rec`, `talk`
   * or `answer`; empty for a kind the firmware does not name.
   */
  alarmType: string;
  /** File id of the recording. */
  fileId: string;
  /** `1` or `2` for two internal file kinds; absent otherwise. */
  typeExtension?: number;
  /** When the recording starts. */
  startTime: AlarmVideoInfoTime;
  /** When the recording ends. */
  endTime: AlarmVideoInfoTime;
};

/** One page of search results in `<alarmVideoInfo>`. */
export type AlarmVideoInfo = {
  /** Zero-based channel of the search. */
  channelId: number;
  /** The search handle from cmd 272. */
  fileHandle: number;
  /** `1` once the search has returned every recording. */
  bFinished: number;
  /** The recordings in this page. */
  alarmVideoList: AlarmVideoInfoItem[];
};

/**
 * Codec for `<alarmVideoInfo>`.
 *
 * @example Build an empty last page
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { alarmVideoInfo } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = alarmVideoInfo.encode({
 *   channelId: 0,
 *   fileHandle: 7,
 *   bFinished: 1,
 *   alarmVideoList: [],
 * });
 *
 * assertStringIncludes(xml, "<bFinished>1</bFinished>");
 * ```
 */
export const alarmVideoInfo: XmlParam<"alarmVideoInfo", AlarmVideoInfo> =
  xmlParam("alarmVideoInfo", {
    channelId: int(),
    fileHandle: int(),
    bFinished: int(),
    alarmVideoList: list(
      "alarmVideo",
      obj({
        fileName: text(),
        alarmType: text(),
        fileId: text(),
        typeExtension: optional(int()),
        startTime: obj({
          year: int(),
          month: int(),
          day: int(),
          hour: int(),
          minute: int(),
          second: int(),
        }),
        endTime: obj({
          year: int(),
          month: int(),
          day: int(),
          hour: int(),
          minute: int(),
          second: int(),
        }),
      }),
    ),
  });
