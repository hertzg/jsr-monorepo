/**
 * `<MD>`: motion detection settings (detection grid, sensitivity by time
 * of day, weekly schedule and alarm actions). The camera replies with it to
 * cmd 46 (`GET_MD_CFG_V20`) and cmd 113 (`GET_DEF_MD_CFG_V20`), and reads
 * it from cmd 47 (`SET_MD_CFG_V20`).
 *
 * Firmware: `net_md_s2x` writes every element, always, except
 * `scope.valueTable` (only when the grid encodes) and the `sensInfo` items
 * (only the enabled ones). It writes exactly four `sensitivityInfo` items
 * and one `timeBlock` per run of scheduled hours. The parser `net_md_x2s`
 * reads whichever top-level fields are present. Inside them it requires
 * `scope.columns` and `scope.rows`, `priority` on each `sensInfo`, and every
 * field of each `timeBlock`; it reads at most four `sensitivityInfo` and
 * `sensInfo` items.
 *
 * @example Read part of a cmd 46 reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { md } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<MD version="1.1"><channelId>0</channelId><enable>1</enable>' +
 *     "<timeBlockList><timeBlock><enable>1</enable><weekDay>Monday</weekDay>" +
 *     "<beginHour>0</beginHour><endHour>23</endHour></timeBlock>" +
 *     "</timeBlockList></MD>",
 * ).root;
 *
 * assertEquals(md.decode(root).timeBlockList?.[0].weekDay, "Monday");
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
  text,
  type XmlParam,
  xmlParam,
} from "../xml.ts";

/** One fixed sensitivity period in `<sensitivityInfoList>`. */
export type MdSensitivityInfo = {
  /** Position of the item, 0 to 3; the parser rejects any other order. */
  id?: number;
  /** Sensitivity, 1 to 50. */
  sensitivity?: number;
  /** Start hour, 0 to 23. */
  beginHour?: number;
  /** Start minute, 0 to 59. */
  beginMinute?: number;
  /** End hour, 0 to 23. */
  endHour?: number;
  /** End minute, 0 to 59. */
  endMinute?: number;
  /** Read by the parser, never written by the camera. */
  enable?: number;
};

/** One enabled sensitivity period in `<sensInfoList>`. */
export type MdSensInfo = {
  /** Priority of the period. */
  priority: number;
  /** Sensitivity, 1 to 50. */
  sensitivity?: number;
  /** Start hour, 0 to 23. */
  beginHour?: number;
  /** Start minute, 0 to 59. */
  beginMinute?: number;
  /** End hour, 0 to 23. */
  endHour?: number;
  /** End minute, 0 to 59. */
  endMinute?: number;
};

/** A run of hours on one weekday in `<timeBlockList>`. */
export type MdTimeBlock = {
  /** 1 when detection is on for these hours, 0 when off. */
  enable: number;
  /** The weekday. */
  weekDay:
    | "Monday"
    | "Tuesday"
    | "Wednesday"
    | "Thursday"
    | "Friday"
    | "Saturday"
    | "Sunday";
  /** First hour, 0 to 23. */
  beginHour: number;
  /** Last hour, inclusive, 0 to 23 and not before `beginHour`. */
  endHour: number;
};

/** The motion detection settings in `<MD>`. */
export type Md = {
  /** Zero-based channel. */
  channelId?: number;
  /** 1 when motion detection is on, 0 when off. */
  enable?: number;
  /** 1 to use the PIR sensor, 0 not to. */
  usepir?: number;
  /** Detection grid columns, 1 to 155. */
  width?: number;
  /** Detection grid rows, 1 to 100. */
  height?: number;
  /** The detection grid. */
  scope?: {
    /** Grid columns, 1 to 155. */
    columns: number;
    /** Grid rows, 1 to 100. */
    rows: number;
    /** Base64 of one byte per grid cell, row by row. */
    valueTable?: string;
  };
  /** Exactly four fixed sensitivity periods. */
  sensitivityInfoList?: MdSensitivityInfo[];
  /** Sensitivity periods with priorities. */
  sensInfoNew?: {
    /** Sensitivity outside every period. */
    sensitivityDefault?: number;
    /** The enabled periods. */
    sensInfoList?: MdSensInfo[];
  };
  /** Weekly schedule, as runs of hours per weekday. */
  timeBlockList?: MdTimeBlock[];
  /** What to do on motion. */
  handleException?: {
    /** Comma-separated actions, such as `rec,push`, or `none`. */
    handleType?: string;
    /** Per-channel action table as text. */
    chnHandleType?: string;
    /** Alarm outputs to trigger, as text. */
    relAlarmOut?: string;
  };
};

/**
 * Codec for `<MD>`.
 *
 * @example Build an `<MD>` element for cmd 47 that turns detection off
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { md } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   md.encode({ channelId: 0, enable: 0 }),
 *   '<MD version="1.1"><channelId>0</channelId><enable>0</enable></MD>',
 * );
 * ```
 */
export const md: XmlParam<"MD", Md> = xmlParam("MD", {
  channelId: optional(int()),
  enable: optional(int()),
  usepir: optional(int()),
  width: optional(int()),
  height: optional(int()),
  scope: optional(obj({
    columns: int(),
    rows: int(),
    valueTable: optional(text()),
  })),
  sensitivityInfoList: optional(list(
    "sensitivityInfo",
    obj({
      id: optional(int()),
      sensitivity: optional(int()),
      beginHour: optional(int()),
      beginMinute: optional(int()),
      endHour: optional(int()),
      endMinute: optional(int()),
      enable: optional(int()),
    }),
  )),
  sensInfoNew: optional(obj({
    sensitivityDefault: optional(int()),
    sensInfoList: optional(list(
      "sensInfo",
      obj({
        priority: int(),
        sensitivity: optional(int()),
        beginHour: optional(int()),
        beginMinute: optional(int()),
        endHour: optional(int()),
        endMinute: optional(int()),
      }),
    )),
  })),
  timeBlockList: optional(list(
    "timeBlock",
    obj({
      enable: int(),
      weekDay: oneOf(
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ),
      beginHour: int(),
      endHour: int(),
    }),
  )),
  handleException: optional(obj({
    handleType: optional(text()),
    chnHandleType: optional(text()),
    relAlarmOut: optional(text()),
  })),
});
