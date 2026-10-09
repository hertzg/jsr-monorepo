/**
 * `<Flip>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Flip>`. Placeholder: no fields yet. */
export type Flip = Record<PropertyKey, never>;

/** Codec for `<Flip>`. Placeholder: no fields yet. */
export const flip: XmlParam<"Flip", Flip> = xmlParam(
  "Flip",
  {},
);
