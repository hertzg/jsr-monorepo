/**
 * `<timelapseTasks>`: the time-lapse tasks stored for a channel. Read with
 * cmd 321.
 *
 * Firmware: `net_timelapse_task_s2x` writes `channelId` and `uid`, then one
 * `<item>` per task directly under `<timelapseTasks>`, each with `id`,
 * `properties`, `taskType` and `taskState`. `net_timelapse_task_x2s` reads
 * `channelId`, `uid` and up to 128 items (without `taskState`), and skips
 * any field that is missing, so every field is optional.
 *
 * @example Read the cmd 321 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { timelapseTasks } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<timelapseTasks version="1.1"><channelId>0</channelId><uid>disk-1</uid>' +
 *     "<item><id>task-1</id><properties>p</properties><taskType>mp4</taskType>" +
 *     "<taskState>RUNNING</taskState></item></timelapseTasks>",
 * ).root;
 *
 * assertEquals(timelapseTasks.decode(root).item?.[0].taskState, "RUNNING");
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

/** One task in `<timelapseTasks>`. */
export type TimelapseTask = {
  /** Task id. */
  id?: string;
  /** Free-form task properties. */
  properties?: string;
  /** Output format. */
  taskType?: "mp4" | "jpeg";
  /** What the task is doing; reply only, the camera never reads it. */
  taskState?: "IDLE" | "RUNNING" | "DELETING";
};

/** The stored time-lapse tasks in `<timelapseTasks>`. */
export type TimelapseTasks = {
  /** Zero-based channel. */
  channelId?: number;
  /** Storage UID. */
  uid?: string;
  /** One entry per task, as repeated `<item>` elements. */
  item?: TimelapseTask[];
};

/**
 * Codec for `<timelapseTasks>`.
 *
 * @example Build the cmd 321 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { timelapseTasks } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   timelapseTasks.encode({ channelId: 0 }),
 *   '<timelapseTasks version="1.1"><channelId>0</channelId></timelapseTasks>',
 * );
 * ```
 */
export const timelapseTasks: XmlParam<"timelapseTasks", TimelapseTasks> =
  xmlParam("timelapseTasks", {
    channelId: optional(int()),
    uid: optional(text()),
    item: optional(repeated(obj({
      id: optional(text()),
      properties: optional(text()),
      taskType: optional(oneOf("mp4", "jpeg")),
      taskState: optional(oneOf("IDLE", "RUNNING", "DELETING")),
    }))),
  });
