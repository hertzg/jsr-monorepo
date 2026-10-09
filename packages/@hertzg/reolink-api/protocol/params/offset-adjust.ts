/**
 * `<OffsetAdjust>`: image offset calibration. No command in the request
 * table uses it.
 *
 * Firmware (Video Doorbell PoE): `nets_param_offset_adjust_x2s` reads only
 * `maxOffset`, when present. No library serializer exists. A netserver
 * reply builder (0x818bc, `nets_snap.cpp`) writes `OffsetX`, `OffsetY` and
 * `Offset` from the same parameter, but no command is known to reach it.
 * Every field is optional.
 *
 * @example Read an `<OffsetAdjust>` reply
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { offsetAdjust } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<OffsetAdjust version="1.1"><OffsetX>4</OffsetX><OffsetY>-2</OffsetY>' +
 *     "<Offset>5</Offset></OffsetAdjust>",
 * ).root;
 *
 * assertEquals(offsetAdjust.decode(root).OffsetY, -2);
 * ```
 *
 * @module
 */

import { int, optional, type XmlParam, xmlParam } from "../xml.ts";

/** The offset calibration request and result in `<OffsetAdjust>`. */
export type OffsetAdjust = {
  /** Largest accepted offset; request only. */
  maxOffset?: number;
  /** Measured horizontal offset; reply only. */
  OffsetX?: number;
  /** Measured vertical offset; reply only. */
  OffsetY?: number;
  /** Measured overall offset; reply only. */
  Offset?: number;
};

/**
 * Codec for `<OffsetAdjust>`.
 *
 * @example Build an `<OffsetAdjust>` request
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { offsetAdjust } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   offsetAdjust.encode({ maxOffset: 16 }),
 *   '<OffsetAdjust version="1.1"><maxOffset>16</maxOffset></OffsetAdjust>',
 * );
 * ```
 */
export const offsetAdjust: XmlParam<"OffsetAdjust", OffsetAdjust> = xmlParam(
  "OffsetAdjust",
  {
    maxOffset: optional(int()),
    OffsetX: optional(int()),
    OffsetY: optional(int()),
    Offset: optional(int()),
  },
);
