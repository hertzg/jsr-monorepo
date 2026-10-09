/**
 * `<DayNightThreshold>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<DayNightThreshold>`. Placeholder: no fields yet. */
export type DayNightThreshold = Record<PropertyKey, never>;

/** Codec for `<DayNightThreshold>`. Placeholder: no fields yet. */
export const dayNightThreshold: XmlParam<
  "DayNightThreshold",
  DayNightThreshold
> = xmlParam(
  "DayNightThreshold",
  {},
);
