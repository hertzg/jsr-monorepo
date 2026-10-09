/**
 * `<AlarmArea>`: the detection grids for motion and each AI target type on
 * one channel (cmd 345). Request only: the camera reads it and never writes
 * it back.
 *
 * Firmware: `net_alarm_area_x2s` reads `chn` and any of the five area
 * elements, skipping those that are missing. Each area goes through
 * `get_area_from_xmlnode`, which needs `width` 1..155, `height` 1..100 and
 * an `area` that decodes to that many cells, or rejects the request.
 *
 * @example Build a motion grid request
 * ```ts
 * import { assertStringIncludes } from "@std/assert";
 * import { alarmArea } from "@hertzg/reolink-api/protocol/params";
 *
 * const xml = alarmArea.encode({
 *   chn: 0,
 *   mdArea: { width: 8, height: 1, area: "AQEBAQEBAQE=" },
 * });
 *
 * assertStringIncludes(xml, "<mdArea><width>8</width>");
 * ```
 *
 * @module
 */

import { int, obj, optional, text, type XmlParam, xmlParam } from "../xml.ts";

/** One detection grid inside `<AlarmArea>`. */
export type AlarmAreaGrid = {
  /** Grid columns, 1..155. */
  width: number;
  /** Grid rows, 1..100. */
  height: number;
  /** The grid as base64, one byte per cell, row by row. */
  area: string;
};

/** The detection grids in `<AlarmArea>`; each one present is replaced. */
export type AlarmArea = {
  /** Zero-based channel. */
  chn?: number;
  /** Motion detection grid. */
  mdArea?: AlarmAreaGrid;
  /** Person detection grid. */
  personArea?: AlarmAreaGrid;
  /** Vehicle detection grid. */
  vehicleArea?: AlarmAreaGrid;
  /** Face detection grid. */
  faceArea?: AlarmAreaGrid;
  /** Dog and cat detection grid. */
  dogCatArea?: AlarmAreaGrid;
};

/**
 * Codec for `<AlarmArea>`.
 *
 * @example Read back a person grid request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { alarmArea } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<AlarmArea version="1.1"><chn>0</chn><personArea><width>2</width>' +
 *     "<height>1</height><area>AQE=</area></personArea></AlarmArea>",
 * ).root;
 *
 * assertEquals(alarmArea.decode(root).personArea?.width, 2);
 * ```
 */
export const alarmArea: XmlParam<"AlarmArea", AlarmArea> = xmlParam(
  "AlarmArea",
  {
    chn: optional(int()),
    mdArea: optional(obj({ width: int(), height: int(), area: text() })),
    personArea: optional(obj({ width: int(), height: int(), area: text() })),
    vehicleArea: optional(obj({ width: int(), height: int(), area: text() })),
    faceArea: optional(obj({ width: int(), height: int(), area: text() })),
    dogCatArea: optional(obj({ width: int(), height: int(), area: text() })),
  },
);
