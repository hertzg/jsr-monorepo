/**
 * `<DeleteRecordFile>`: deletes recordings in a time window. Sent with
 * cmd 650 (`DELETE_RECORD_FILE`) to the Video Doorbell PoE.
 *
 * Firmware: `net_delete_record_file_x2s` reads whichever field is present
 * and rejects a `streamType` above 7. There is no serializer: the element
 * only appears in requests.
 *
 * @example Read a cmd 650 request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { deleteRecordFile } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   "<DeleteRecordFile><chnbits>1</chnbits><streamType>0</streamType>" +
 *     "</DeleteRecordFile>",
 * ).root;
 *
 * assertEquals(deleteRecordFile.decode(root).chnbits, 1n);
 * ```
 *
 * @module
 */

import { int, obj, optional, u64, type XmlParam, xmlParam } from "../xml.ts";

/** A point in time in `<startTime>` or `<endTime>` of `<DeleteRecordFile>`. */
export type DeleteRecordFileTime = {
  /** Year; the parser rejects a negative one. */
  year?: number;
  /** Month, 1 to 12. */
  month?: number;
  /** Day of the month, 1 to 31. */
  day?: number;
  /** Hour, 0 to 23. */
  hour?: number;
  /** Minute, 0 to 59. */
  minute?: number;
  /** Second, 0 to 59. */
  second?: number;
};

/** The recordings to delete in `<DeleteRecordFile>`. */
export type DeleteRecordFile = {
  /** A 64-bit channel bitmask; presumably bit n selects channel n. */
  chnbits?: bigint;
  /** Stream type, 0 to 7. */
  streamType?: number;
  /** A merge flag; its effect is not established. */
  bmerge?: number;
  /** Start of the window to delete. */
  startTime?: DeleteRecordFileTime;
  /** End of the window to delete. */
  endTime?: DeleteRecordFileTime;
};

/**
 * Codec for `<DeleteRecordFile>`.
 *
 * @example Build a cmd 650 request for one day on channel 0
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { deleteRecordFile } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = deleteRecordFile.encode({
 *   chnbits: 1n,
 *   streamType: 0,
 *   startTime: { year: 2026, month: 10, day: 9, hour: 0, minute: 0, second: 0 },
 *   endTime: { year: 2026, month: 10, day: 9, hour: 23, minute: 59, second: 59 },
 * });
 *
 * assertStringIncludes(xml, "<chnbits>1</chnbits>");
 * ```
 */
export const deleteRecordFile: XmlParam<"DeleteRecordFile", DeleteRecordFile> =
  xmlParam("DeleteRecordFile", {
    chnbits: optional(u64()),
    streamType: optional(int()),
    bmerge: optional(int()),
    startTime: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      hour: optional(int()),
      minute: optional(int()),
      second: optional(int()),
    })),
    endTime: optional(obj({
      year: optional(int()),
      month: optional(int()),
      day: optional(int()),
      hour: optional(int()),
      minute: optional(int()),
      second: optional(int()),
    })),
  });
