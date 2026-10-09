/**
 * `<PerformanceInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PerformanceInfo>`. Placeholder: no fields yet. */
export type PerformanceInfo = Record<PropertyKey, never>;

/** Codec for `<PerformanceInfo>`. Placeholder: no fields yet. */
export const performanceInfo: XmlParam<"PerformanceInfo", PerformanceInfo> =
  xmlParam(
    "PerformanceInfo",
    {},
  );
