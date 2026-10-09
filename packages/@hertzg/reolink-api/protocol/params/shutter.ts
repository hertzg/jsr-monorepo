/**
 * `<Shutter>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Shutter>`. Placeholder: no fields yet. */
export type Shutter = Record<PropertyKey, never>;

/** Codec for `<Shutter>`. Placeholder: no fields yet. */
export const shutter: XmlParam<"Shutter", Shutter> = xmlParam(
  "Shutter",
  {},
);
