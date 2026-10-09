/**
 * `<Record>`: when each alarm type triggers recording, per channel. Read
 * with cmd 81 (`GET_RECSCHEDULE_V20`) and written with cmd 82
 * (`SET_RECSCHEDULE_V20`).
 *
 * Firmware: `net_record_schedule_s2x` writes every field always, with one
 * `<typeScheduleList>` `<item>` per alarm type the device supports.
 * `net_record_schedule_x2s` reads whichever field is present and rejects a
 * negative `channelId`; an `<item>` must carry a non-empty `type` and
 * `valueTable`.
 *
 * @example Read a cmd 81 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { record } from "@hertzg/reolink-api/protocol/params";
 *
 * const week = "1".repeat(168);
 * const root = parse(
 *   '<Record version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     `<typeScheduleList><item><type>Normal</type><valueTable>${week}</valueTable></item>` +
 *     "</typeScheduleList></Record>",
 * ).root;
 *
 * assertEquals(record.decode(root).typeScheduleList?.[0].type, "Normal");
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

/** The recording schedule in `<Record>`. */
export type RecordParam = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 when scheduled recording is on, 0 when off. */
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
 * Codec for `<Record>`.
 *
 * @example Record continuously every hour of the week
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { record } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = record.encode({
 *   channelId: 0,
 *   enable: 1,
 *   typeScheduleList: [{ type: "Normal", valueTable: "1".repeat(168) }],
 * });
 *
 * assertStringIncludes(xml, "<typeScheduleList><item><type>Normal</type>");
 * ```
 */
export const record: XmlParam<"Record", RecordParam> = xmlParam("Record", {
  channelId: optional(int()),
  enable: optional(int()),
  typeScheduleList: optional(
    list("item", obj({ type: text(), valueTable: text() })),
  ),
});
