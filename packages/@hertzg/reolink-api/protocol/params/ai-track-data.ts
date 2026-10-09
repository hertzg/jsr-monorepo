/**
 * `<AiTrackData>`: the AI tracking data file for one day. Sent and returned
 * with cmd 362.
 *
 * Firmware (Video Doorbell PoE): `net_ai_track_data_x2s` reads `year`,
 * `month` and `day` when present and skips the rest. It rejects a negative
 * year, a month outside 1 to 12 and a day outside 1 to 31. No library
 * serializer exists; the cmd 362 reply is built in netserver (0x44780) and
 * always writes `fileName` and `size`. The date is request only and the
 * file is reply only, so every field is optional.
 *
 * @example Read a cmd 362 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { aiTrackData } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AiTrackData version="1.1"><fileName>track_20261009.dat</fileName>' +
 *     "<size>2048</size></AiTrackData>",
 * ).root;
 *
 * assertEquals(aiTrackData.decode(root).size, 2048);
 * ```
 *
 * @module
 */

import { int, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** The AI tracking data request and reply in `<AiTrackData>`. */
export type AiTrackData = {
  /** Name of the data file; cmd 362 reply only. */
  fileName?: string;
  /** Size of the data file; cmd 362 reply only. */
  size?: number;
  /** Year of the day to fetch, 0 or more; request only. */
  year?: number;
  /** Month, 1 to 12; request only. */
  month?: number;
  /** Day of the month, 1 to 31; request only. */
  day?: number;
};

/**
 * Codec for `<AiTrackData>`.
 *
 * @example Build a cmd 362 request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { aiTrackData } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = aiTrackData.encode({ year: 2026, month: 10, day: 9 });
 *
 * assertStringIncludes(xml, "<year>2026</year><month>10</month><day>9</day>");
 * ```
 */
export const aiTrackData: XmlParam<"AiTrackData", AiTrackData> = xmlParam(
  "AiTrackData",
  {
    fileName: optional(text()),
    size: optional(int()),
    year: optional(int()),
    month: optional(int()),
    day: optional(int()),
  },
);
