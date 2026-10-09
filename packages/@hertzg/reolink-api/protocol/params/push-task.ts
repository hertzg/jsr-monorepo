/**
 * `<PushTask>`: when the camera sends phone push notifications, per alarm
 * type, as a weekly hour grid. Read with cmd 219, written with cmd 218.
 *
 * Firmware: `nets_push_task_s2x` writes every field, always, with one
 * `<item>` per alarm type the channel supports. `nets_param_push_task_x2s`
 * reads whichever fields are present, so every field is optional. An
 * `<item>` without `<type>` or `<valueTable>` is rejected.
 *
 * @example Read a cmd 219 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { pushTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<PushTask version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<typeScheduleList><item><type>MD</type>" +
 *     `<valueTable>${"1".repeat(168)}</valueTable></item></typeScheduleList>` +
 *     "</PushTask>",
 * ).root;
 *
 * assertEquals(pushTask.decode(root).enable, 1);
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

/** The push notification schedule in `<PushTask>`. */
export type PushTask = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 sends push notifications, 0 does not. */
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
 * Codec for `<PushTask>`.
 *
 * @example Build a `<PushTask>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { pushTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = pushTask.encode({
 *   channelId: 0,
 *   enable: 0,
 *   typeScheduleList: [{ type: "vehicle", valueTable: "0".repeat(168) }],
 * });
 *
 * assertStringIncludes(xml, "<item><type>vehicle</type>");
 * ```
 */
export const pushTask: XmlParam<"PushTask", PushTask> = xmlParam(
  "PushTask",
  {
    channelId: optional(int()),
    enable: optional(int()),
    typeScheduleList: optional(
      list("item", obj({ type: text(), valueTable: text() })),
    ),
  },
);
