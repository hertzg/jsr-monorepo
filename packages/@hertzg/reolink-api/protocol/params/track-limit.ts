/**
 * `<trackLimit>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<trackLimit>`. Placeholder: no fields yet. */
export type TrackLimit = Record<PropertyKey, never>;

/** Codec for `<trackLimit>`. Placeholder: no fields yet. */
export const trackLimit: XmlParam<"trackLimit", TrackLimit> = xmlParam(
  "trackLimit",
  {},
);
