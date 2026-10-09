/**
 * `<trackSchedule>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<trackSchedule>`. Placeholder: no fields yet. */
export type TrackSchedule = Record<PropertyKey, never>;

/** Codec for `<trackSchedule>`. Placeholder: no fields yet. */
export const trackSchedule: XmlParam<"trackSchedule", TrackSchedule> = xmlParam(
  "trackSchedule",
  {},
);
