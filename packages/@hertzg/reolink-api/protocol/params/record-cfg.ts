/**
 * `<RecordCfg>`: recording settings (overwrite, pre- and post-record time,
 * file length). The camera replies with it to cmd 54 (`GET_RECORD_V20`)
 * and reads it from cmd 55 (`SET_RECORD_V20`).
 *
 * Firmware: the cmd 54 handler writes every scalar field, always, and
 * writes `cyclelist` and `timeList` only when they hold at least one entry.
 * The parser `nets_rec_x2s` reads whichever fields are present, so none is
 * required.
 *
 * @example Read a cmd 54 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { recordCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<RecordCfg version="1.1"><channelId>0</channelId><cycle>1</cycle>' +
 *     "<recordDelayTime>30</recordDelayTime><preRecordTime>5</preRecordTime>" +
 *     "<packageTime>60</packageTime><timeList><time>30</time><time>60</time>" +
 *     "</timeList></RecordCfg>",
 * ).root;
 *
 * assertEquals(recordCfg.decode(root).timeList, [30, 60]);
 * ```
 *
 * @module
 */

import { int, list, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The recording settings in `<RecordCfg>`. */
export type RecordCfg = {
  /** Zero-based channel. */
  channelId?: number;
  /** Loop recording; by its name, non-zero overwrites the oldest files. */
  cycle?: number;
  /** Post-record time, by its name; units not recovered. */
  recordDelayTime?: number;
  /** Pre-record time, by its name; units not recovered. */
  preRecordTime?: number;
  /** Recording file length, by its name; units not recovered. */
  packageTime?: number;
  /** Up to ten `<item>` values; their meaning is not recovered. */
  cyclelist?: number[];
  /** Up to ten `<time>` values; their meaning is not recovered. */
  timeList?: number[];
};

/**
 * Codec for `<RecordCfg>`.
 *
 * @example Build a `<RecordCfg>` element for cmd 55
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { recordCfg } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = recordCfg.encode({ channelId: 0, preRecordTime: 10 });
 *
 * assertStringIncludes(xml, "<preRecordTime>10</preRecordTime>");
 * ```
 */
export const recordCfg: XmlParam<"RecordCfg", RecordCfg> = xmlParam(
  "RecordCfg",
  {
    channelId: optional(int()),
    cycle: optional(int()),
    recordDelayTime: optional(int()),
    preRecordTime: optional(int()),
    packageTime: optional(int()),
    cyclelist: optional(list("item", int())),
    timeList: optional(list("time", int())),
  },
);
