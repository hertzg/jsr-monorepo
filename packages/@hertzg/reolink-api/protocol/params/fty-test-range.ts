/**
 * `<ftyTestRange>`: the pass ranges for factory battery and sensor tests,
 * each a `<max>`/`<min>` pair. A factory element that no registered command
 * carries.
 *
 * Firmware: `nets_param_fty_range_s2x` writes every range, always, each
 * with `max` before `min`. `nets_param_fty_range_x2s` reads each range, and
 * each bound inside it, when present and skips a missing one, so every
 * field is optional here.
 *
 * @example Read one range from an `<ftyTestRange>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { parse } from "@std/xml";
 * import { ftyTestRange } from "@hertzg/reolink-api/protocol/params";
 *
 * const root = parse(
 *   '<ftyTestRange version="1.1">' +
 *     "<rangeVoltage><max>4200</max><min>3300</min></rangeVoltage>" +
 *     "</ftyTestRange>",
 * ).root;
 *
 * assertEquals(ftyTestRange.decode(root).rangeVoltage, { max: 4200, min: 3300 });
 * ```
 *
 * @module
 */

import { int, obj, optional, type XmlParam, xmlParam } from "../xml.ts";

/** One pass range in `<ftyTestRange>`. */
export type FtyTestRangeBounds = {
  /** Upper bound. */
  max?: number;
  /** Lower bound. */
  min?: number;
};

/** The factory test pass ranges in `<ftyTestRange>`. */
export type FtyTestRange = {
  /** Battery quantity (charge level) range. */
  rangeQuantity?: FtyTestRangeBounds;
  /** Temperature range. */
  rangeTemperature?: FtyTestRangeBounds;
  /** Light sensor 0 (fast auto exposure) range. */
  rangeCds0FastAe?: FtyTestRangeBounds;
  /** Light sensor 1 (color/black-and-white switch) range. */
  rangeCds1CbwSwitch?: FtyTestRangeBounds;
  /** Current range. */
  rangeCurrent?: FtyTestRangeBounds;
  /** Voltage range. */
  rangeVoltage?: FtyTestRangeBounds;
  /** Reboot count range. */
  rangeRebootTimes?: FtyTestRangeBounds;
};

/**
 * Codec for `<ftyTestRange>`.
 *
 * @example Build an `<ftyTestRange>` element
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { ftyTestRange } from "@hertzg/reolink-api/protocol/params";
 *
 * assertEquals(
 *   ftyTestRange.encode({ rangeCurrent: { max: 500, min: 100 } }),
 *   '<ftyTestRange version="1.1">' +
 *     "<rangeCurrent><max>500</max><min>100</min></rangeCurrent>" +
 *     "</ftyTestRange>",
 * );
 * ```
 */
export const ftyTestRange: XmlParam<"ftyTestRange", FtyTestRange> = xmlParam(
  "ftyTestRange",
  {
    rangeQuantity: optional(
      obj({ max: optional(int()), min: optional(int()) }),
    ),
    rangeTemperature: optional(
      obj({ max: optional(int()), min: optional(int()) }),
    ),
    rangeCds0FastAe: optional(
      obj({ max: optional(int()), min: optional(int()) }),
    ),
    rangeCds1CbwSwitch: optional(
      obj({ max: optional(int()), min: optional(int()) }),
    ),
    rangeCurrent: optional(obj({ max: optional(int()), min: optional(int()) })),
    rangeVoltage: optional(obj({ max: optional(int()), min: optional(int()) })),
    rangeRebootTimes: optional(
      obj({ max: optional(int()), min: optional(int()) }),
    ),
  },
);
