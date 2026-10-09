/**
 * `<AudioTask>`: when the camera plays its alarm sound, per alarm type, as
 * a weekly hour grid. Read with cmd 232, written with cmd 231.
 *
 * Firmware: `nets_audio_task_s2x` writes every field, always, with one
 * `<item>` per alarm type the channel supports. `nets_param_audio_task_x2s`
 * reads whichever fields are present, so every field is optional. An
 * `<item>` without `<type>` or `<valueTable>` is rejected.
 *
 * @example Read a cmd 232 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { audioTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AudioTask version="1.1"><channelId>0</channelId><enable>0</enable>' +
 *     "<typeScheduleList><item><type>people</type>" +
 *     `<valueTable>${"0".repeat(168)}</valueTable></item></typeScheduleList>` +
 *     "</AudioTask>",
 * ).root;
 *
 * assertEquals(audioTask.decode(root).typeScheduleList?.[0].type, "people");
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

/** The alarm sound schedule in `<AudioTask>`. */
export type AudioTask = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 plays the alarm sound, 0 does not. */
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
 * Codec for `<AudioTask>`.
 *
 * @example Build a `<AudioTask>` element
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { audioTask } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = audioTask.encode({
 *   channelId: 0,
 *   enable: 1,
 *   typeScheduleList: [{ type: "MD", valueTable: "1".repeat(168) }],
 * });
 *
 * assertStringIncludes(xml, "<enable>1</enable>");
 * ```
 */
export const audioTask: XmlParam<"AudioTask", AudioTask> = xmlParam(
  "AudioTask",
  {
    channelId: optional(int()),
    enable: optional(int()),
    typeScheduleList: optional(
      list("item", obj({ type: text(), valueTable: text() })),
    ),
  },
);
