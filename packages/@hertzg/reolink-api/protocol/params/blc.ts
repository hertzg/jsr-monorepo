/**
 * `<BLC>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BLC>`. Placeholder: no fields yet. */
export type Blc = Record<PropertyKey, never>;

/** Codec for `<BLC>`. Placeholder: no fields yet. */
export const blc: XmlParam<"BLC", Blc> = xmlParam(
  "BLC",
  {},
);
