/**
 * `<AutoUpdate>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AutoUpdate>`. Placeholder: no fields yet. */
export type AutoUpdate = Record<PropertyKey, never>;

/** Codec for `<AutoUpdate>`. Placeholder: no fields yet. */
export const autoUpdate: XmlParam<"AutoUpdate", AutoUpdate> = xmlParam(
  "AutoUpdate",
  {},
);
