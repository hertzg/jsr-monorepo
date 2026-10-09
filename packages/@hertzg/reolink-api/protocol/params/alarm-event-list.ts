/**
 * `<AlarmEventList>`: the alarm state of every channel. The camera pushes it
 * unasked as cmd 33 when motion, AI detection or recording changes.
 *
 * Firmware: the cmd 33 push builder writes one `<AlarmEvent>` per channel
 * with `net_alarm_report_s2x`, which writes every field, always. The
 * element is push-only; no parser reads it.
 *
 * `@hertzg/reolink-api/protocol/event` turns these raw strings into a
 * friendlier shape.
 *
 * @example Read an idle cmd 33 push
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { alarmEventList } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AlarmEventList version="1.1"><AlarmEvent version="1.1">' +
 *     "<channelId>0</channelId><status>none</status><AItype>none</AItype>" +
 *     "<recording>0</recording><timeStamp>0</timeStamp>" +
 *     "</AlarmEvent></AlarmEventList>",
 * ).root;
 *
 * assertEquals(alarmEventList.decode(root).AlarmEvent[0].status, "none");
 * ```
 *
 * @module
 */

import { int, obj, repeated, text, type XmlParam, xmlParam } from "../xml.ts";

/** The per-channel alarm states in `<AlarmEventList>`. */
export type AlarmEventList = {
  /** One `<AlarmEvent>` per channel. */
  AlarmEvent: {
    /** Zero-based channel. */
    channelId: number;
    /**
     * Comma-separated alarm kinds, in this order: `MD`, `videoLoss`,
     * `blind`, `IOAlarm`; `none` when idle.
     */
    status: string;
    /**
     * Comma-separated AI detections, in this order: `people`, `vehicle`,
     * `face`, `other`, `dog_cat`; `none` when nothing is detected.
     */
    AItype: string;
    /** 1 while recording, else 0. */
    recording: number;
    /** Event time as the camera reports it; 0 when idle. */
    timeStamp: number;
  }[];
};

/**
 * Codec for `<AlarmEventList>`.
 *
 * Each `<AlarmEvent>` the camera writes carries its own `version="1.1"`;
 * `encode` writes it only on `<AlarmEventList>`.
 *
 * @example Build an `<AlarmEventList>` with motion and an AI detection
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { alarmEventList } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = alarmEventList.encode({
 *   AlarmEvent: [{
 *     channelId: 0,
 *     status: "MD",
 *     AItype: "dog_cat",
 *     recording: 1,
 *     timeStamp: 0,
 *   }],
 * });
 *
 * assertStringIncludes(xml, "<AItype>dog_cat</AItype>");
 * ```
 */
export const alarmEventList: XmlParam<"AlarmEventList", AlarmEventList> =
  xmlParam("AlarmEventList", {
    AlarmEvent: repeated(obj({
      channelId: int(),
      status: text(),
      AItype: text(),
      recording: int(),
      timeStamp: int(),
    })),
  });
