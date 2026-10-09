/**
 * `<Shelter>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Shelter>`. Placeholder: no fields yet. */
export type Shelter = Record<PropertyKey, never>;

/** Codec for `<Shelter>`. Placeholder: no fields yet. */
export const shelter: XmlParam<"Shelter", Shelter> = xmlParam(
  "Shelter",
  {},
);
