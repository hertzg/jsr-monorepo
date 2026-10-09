/**
 * `<DayRecords>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<DayRecords>`. Placeholder: no fields yet. */
export type DayRecords = Record<PropertyKey, never>;

/** Codec for `<DayRecords>`. Placeholder: no fields yet. */
export const dayRecords: XmlParam<"DayRecords", DayRecords> = xmlParam(
  "DayRecords",
  {},
);
