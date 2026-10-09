/**
 * `<DayNightMode>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<DayNightMode>`. Placeholder: no fields yet. */
export type DayNightMode = Record<PropertyKey, never>;

/** Codec for `<DayNightMode>`. Placeholder: no fields yet. */
export const dayNightMode: XmlParam<"DayNightMode", DayNightMode> = xmlParam(
  "DayNightMode",
  {},
);
