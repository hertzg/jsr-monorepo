/**
 * `<Norm>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Norm>`. Placeholder: no fields yet. */
export type Norm = Record<PropertyKey, never>;

/** Codec for `<Norm>`. Placeholder: no fields yet. */
export const norm: XmlParam<"Norm", Norm> = xmlParam(
  "Norm",
  {},
);
