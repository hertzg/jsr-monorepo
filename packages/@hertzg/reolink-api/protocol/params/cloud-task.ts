/**
 * `<CloudTask>`: when the camera uploads alarm recordings to the cloud, per
 * alarm type, as a weekly hour grid. Read with cmd 236, written with
 * cmd 235.
 *
 * Firmware: `cgi_cloud_task_s2x` writes every field, always, with one
 * `<item>` per alarm type the channel supports. `nets_param_cloud_task_x2s`
 * reads whichever fields are present, so every field is optional. An
 * `<item>` without `<type>` or `<valueTable>` is rejected.
 *
 * @example Read a cmd 236 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { cloudTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CloudTask version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<typeScheduleList><item><type>MD</type>" +
 *     `<valueTable>${"1".repeat(168)}</valueTable></item></typeScheduleList>` +
 *     "</CloudTask>",
 * ).root;
 *
 * assertEquals(cloudTask.decode(root).channelId, 0);
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

/** The cloud upload schedule in `<CloudTask>`. */
export type CloudTask = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 uploads to the cloud, 0 does not. */
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
 * Codec for `<CloudTask>`.
 *
 * @example Build a `<CloudTask>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { cloudTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = cloudTask.encode({
 *   channelId: 0,
 *   enable: 1,
 *   typeScheduleList: [{ type: "face", valueTable: "1".repeat(168) }],
 * });
 *
 * assertStringIncludes(xml, "<type>face</type>");
 * ```
 */
export const cloudTask: XmlParam<"CloudTask", CloudTask> = xmlParam(
  "CloudTask",
  {
    channelId: optional(int()),
    enable: optional(int()),
    typeScheduleList: optional(
      list("item", obj({ type: text(), valueTable: text() })),
    ),
  },
);
