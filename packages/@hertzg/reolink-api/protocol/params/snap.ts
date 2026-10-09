/**
 * `<Snap>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Snap>`. Placeholder: no fields yet. */
export type Snap = Record<PropertyKey, never>;

/** Codec for `<Snap>`. Placeholder: no fields yet. */
export const snap: XmlParam<"Snap", Snap> = xmlParam(
  "Snap",
  {},
);
