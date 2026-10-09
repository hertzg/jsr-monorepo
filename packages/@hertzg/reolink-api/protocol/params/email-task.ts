/**
 * `<EmailTask>`: when the camera sends alarm emails, per alarm type, as a
 * weekly hour grid. Read with cmd 217, written with cmd 216.
 *
 * Firmware: `nets_email_task_s2x` writes every field, always, with one
 * `<item>` per alarm type the channel supports.
 * `nets_param_email_task_cfg_x2s` reads whichever fields are present, so
 * every field is optional. An `<item>` without `<type>` or `<valueTable>`
 * is rejected.
 *
 * @example Read a cmd 217 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { emailTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<EmailTask version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<typeScheduleList><item><type>MD</type>" +
 *     `<valueTable>${"1".repeat(168)}</valueTable></item></typeScheduleList>` +
 *     "</EmailTask>",
 * ).root;
 *
 * assertEquals(emailTask.decode(root).typeScheduleList?.[0].type, "MD");
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

/** The alarm email schedule in `<EmailTask>`. */
export type EmailTask = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 sends emails, 0 does not. */
  enable?: number;
  /** One weekly schedule per alarm type, as `<item>` elements. */
  typeScheduleList?: {
    /**
     * Alarm type, such as `MD`, `IO`, `RF`, `videoloss`, `Normal`, `pir`,
     * `people`, `vehicle`, `face`, `dog_cat` or `other`.
     */
    type: string;
    /** 168 characters of `0` or `1`: seven days of 24 hours, one per hour. */
    valueTable: string;
  }[];
};

/**
 * Codec for `<EmailTask>`.
 *
 * @example Build a `<EmailTask>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { emailTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = emailTask.encode({
 *   channelId: 0,
 *   enable: 1,
 *   typeScheduleList: [{ type: "people", valueTable: "1".repeat(168) }],
 * });
 *
 * assertStringIncludes(xml, "<typeScheduleList><item><type>people</type>");
 * ```
 */
export const emailTask: XmlParam<"EmailTask", EmailTask> = xmlParam(
  "EmailTask",
  {
    channelId: optional(int()),
    enable: optional(int()),
    typeScheduleList: optional(
      list("item", obj({ type: text(), valueTable: text() })),
    ),
  },
);
