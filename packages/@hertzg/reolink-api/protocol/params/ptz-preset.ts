/**
 * `<PtzPreset>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PtzPreset>`. Placeholder: no fields yet. */
export type PtzPreset = Record<PropertyKey, never>;

/** Codec for `<PtzPreset>`. Placeholder: no fields yet. */
export const ptzPreset: XmlParam<"PtzPreset", PtzPreset> = xmlParam(
  "PtzPreset",
  {},
);
