/**
 * `<FtpTask>`: when each alarm type triggers an FTP upload, per channel.
 * Read with cmd 70 (`GET_FTPTASK_V20`) and written with cmd 71
 * (`SET_FTPTASK_V20`).
 *
 * Firmware: `nets_ftp_task_s2x` writes every field always, with one
 * `<typeScheduleList>` `<item>` per alarm type the device supports.
 * `nets_param_ftp_task_x2s` reads whichever field is present and rejects a
 * negative `channelId`; an `<item>` must carry a non-empty `type` and
 * `valueTable`.
 *
 * @example Read a cmd 70 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftpTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const week = "1".repeat(168);
 * const root = parse(
 *   '<FtpTask version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     `<typeScheduleList><item><type>MD</type><valueTable>${week}</valueTable></item>` +
 *     "</typeScheduleList></FtpTask>",
 * ).root;
 *
 * assertEquals(ftpTask.decode(root).typeScheduleList?.[0].type, "MD");
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

/** The FTP upload schedule in `<FtpTask>`. */
export type FtpTask = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 when FTP upload is on, 0 when off. */
  enable?: number;
  /** One schedule per alarm type. */
  typeScheduleList?: {
    /** Alarm type name, such as `MD`, `Normal` or `people`. */
    type: string;
    /** 168 characters of `0` or `1`: 7 days of 24 hours, one per hour. */
    valueTable: string;
  }[];
};

/**
 * Codec for `<FtpTask>`.
 *
 * @example Upload on motion every hour of the week
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { ftpTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = ftpTask.encode({
 *   channelId: 0,
 *   enable: 1,
 *   typeScheduleList: [{ type: "MD", valueTable: "1".repeat(168) }],
 * });
 *
 * assertStringIncludes(xml, "<typeScheduleList><item><type>MD</type>");
 * ```
 */
export const ftpTask: XmlParam<"FtpTask", FtpTask> = xmlParam("FtpTask", {
  channelId: optional(int()),
  enable: optional(int()),
  typeScheduleList: optional(
    list("item", obj({ type: text(), valueTable: text() })),
  ),
});
