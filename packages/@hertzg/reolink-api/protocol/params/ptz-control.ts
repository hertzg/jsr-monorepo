/**
 * `<PtzControl>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PtzControl>`. Placeholder: no fields yet. */
export type PtzControl = Record<PropertyKey, never>;

/** Codec for `<PtzControl>`. Placeholder: no fields yet. */
export const ptzControl: XmlParam<"PtzControl", PtzControl> = xmlParam(
  "PtzControl",
  {},
);
