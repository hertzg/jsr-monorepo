/**
 * `<Crop>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Crop>`. Placeholder: no fields yet. */
export type Crop = Record<PropertyKey, never>;

/** Codec for `<Crop>`. Placeholder: no fields yet. */
export const crop: XmlParam<"Crop", Crop> = xmlParam(
  "Crop",
  {},
);
