/**
 * `<Gain>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Gain>`. Placeholder: no fields yet. */
export type Gain = Record<PropertyKey, never>;

/** Codec for `<Gain>`. Placeholder: no fields yet. */
export const gain: XmlParam<"Gain", Gain> = xmlParam(
  "Gain",
  {},
);
