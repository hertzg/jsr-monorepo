/**
 * `<FloodlightManual>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<FloodlightManual>`. Placeholder: no fields yet. */
export type FloodlightManual = Record<PropertyKey, never>;

/** Codec for `<FloodlightManual>`. Placeholder: no fields yet. */
export const floodlightManual: XmlParam<"FloodlightManual", FloodlightManual> =
  xmlParam(
    "FloodlightManual",
    {},
  );
