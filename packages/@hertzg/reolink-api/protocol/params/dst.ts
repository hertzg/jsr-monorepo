/**
 * `<Dst>`: the daylight saving time rule. Read with cmd 106
 * (`GET_DST_CFG_V20`) and written with cmd 107 (`SET_DST_CFG_V20`).
 *
 * Firmware: `nets_dst_cfg_s2x` writes every field always, ending with a
 * `<version>` child element that is separate from the `version="1.1"`
 * attribute. `nets_param_dst_cfg_x2s` reads whichever field is present,
 * except `<version>`, which it never reads. It rejects a month outside 1 to
 * 12, an hour above 23 and a minute or second above 59.
 *
 * @example Read a cmd 106 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { dst } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<Dst version="1.1"><enable>1</enable><offset>1</offset>' +
 *     "<startMonth>3</startMonth><startWeekIndex>5</startWeekIndex>" +
 *     "<startWeekday>Sunday</startWeekday><startHour>2</startHour>" +
 *     "<startMinute>0</startMinute><startSecond>0</startSecond>" +
 *     "<endMonth>10</endMonth><endWeekIndex>5</endWeekIndex>" +
 *     "<endWeekday>Sunday</endWeekday><endHour>3</endHour>" +
 *     "<endMinute>0</endMinute><endSecond>0</endSecond><version>1</version></Dst>",
 * ).root;
 *
 * assertEquals(dst.decode(root).endMonth, 10);
 * ```
 *
 * @module
 */

import { int, oneOf, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The daylight saving time rule in `<Dst>`. */
export type Dst = {
  /** 1 when daylight saving time is on, 0 when off. */
  enable?: number;
  /** How far the clock moves. */
  offset?: number;
  /** Month DST starts, 1 to 12. */
  startMonth?: number;
  /** Which week of the month DST starts. */
  startWeekIndex?: number;
  /** Day of the week DST starts. */
  startWeekday?:
    | "Sunday"
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday";
  /** Hour DST starts, 0 to 23. */
  startHour?: number;
  /** Minute DST starts, 0 to 59. */
  startMinute?: number;
  /** Second DST starts, 0 to 59. */
  startSecond?: number;
  /** Month DST ends, 1 to 12. */
  endMonth?: number;
  /** Which week of the month DST ends. */
  endWeekIndex?: number;
  /** Day of the week DST ends. */
  endWeekday?:
    | "Sunday"
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday";
  /** Hour DST ends, 0 to 23. */
  endHour?: number;
  /** Minute DST ends, 0 to 59. */
  endMinute?: number;
  /** Second DST ends, 0 to 59. */
  endSecond?: number;
  /** The `<version>` child element; reply only. */
  version?: number;
};

/**
 * Codec for `<Dst>`.
 *
 * @example Switch daylight saving time off
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { dst } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   dst.encode({ enable: 0 }),
 *   '<Dst version="1.1"><enable>0</enable></Dst>',
 * );
 * ```
 */
export const dst: XmlParam<"Dst", Dst> = xmlParam("Dst", {
  enable: optional(int()),
  offset: optional(int()),
  startMonth: optional(int()),
  startWeekIndex: optional(int()),
  startWeekday: optional(
    oneOf(
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ),
  ),
  startHour: optional(int()),
  startMinute: optional(int()),
  startSecond: optional(int()),
  endMonth: optional(int()),
  endWeekIndex: optional(int()),
  endWeekday: optional(
    oneOf(
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ),
  ),
  endHour: optional(int()),
  endMinute: optional(int()),
  endSecond: optional(int()),
  version: optional(int()),
});
