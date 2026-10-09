/**
 * `<CoverPreview>`: asks for preview frames of a recording. Sent with
 * cmd 298.
 *
 * Firmware: `net_cover_preview_x2s` reads `channelId`, `streamType`,
 * `startTime`, `endTime` and `frameList` (up to 40 `<frameNo>`), skipping
 * any that are missing. It rejects a negative `channelId` and reads an
 * unknown `streamType` as `mainStream`. No serializer exists. Every field
 * is optional.
 *
 * @example Read a `<CoverPreview>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { coverPreview } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<CoverPreview version="1.1"><channelId>0</channelId>' +
 *     "<streamType>subStream</streamType>" +
 *     "<frameList><frameNo>1</frameNo><frameNo>5</frameNo></frameList>" +
 *     "</CoverPreview>",
 * ).root;
 *
 * assertEquals(coverPreview.decode(root).frameList, [1, 5]);
 * ```
 *
 * @module
 */

import {
  int,
  list,
  obj,
  oneOf,
  optional,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** A date and time in `<CoverPreview>`. */
export type CoverPreviewTime = {
  /** Year, such as 2026. */
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

/** The preview request in `<CoverPreview>`. */
export type CoverPreview = {
  /** Zero-based channel; the firmware rejects a negative value. */
  channelId?: number;
  /** The stream the recording was made from. */
  streamType?: "mainStream" | "subStream" | "mobileStream" | "externStream";
  /** Start of the recording. */
  startTime?: CoverPreviewTime;
  /** End of the recording. */
  endTime?: CoverPreviewTime;
  /** Frame numbers to preview, as `<frameNo>` items; up to 40 are read. */
  frameList?: number[];
};

function time() {
  return obj({
    year: optional(int()),
    month: optional(int()),
    day: optional(int()),
    hour: optional(int()),
    minute: optional(int()),
    second: optional(int()),
  });
}

/**
 * Codec for `<CoverPreview>`.
 *
 * @example Ask for three frames of a recording
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { coverPreview } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = coverPreview.encode({
 *   channelId: 0,
 *   streamType: "mainStream",
 *   startTime: { year: 2026, month: 10, day: 9, hour: 8, minute: 0, second: 0 },
 *   frameList: [0, 10, 20],
 * });
 *
 * assertStringIncludes(xml, "<frameList><frameNo>0</frameNo>");
 * ```
 */
export const coverPreview: XmlParam<"CoverPreview", CoverPreview> = xmlParam(
  "CoverPreview",
  {
    channelId: optional(int()),
    streamType: optional(
      oneOf("mainStream", "subStream", "mobileStream", "externStream"),
    ),
    startTime: optional(time()),
    endTime: optional(time()),
    frameList: optional(list("frameNo", int())),
  },
);
