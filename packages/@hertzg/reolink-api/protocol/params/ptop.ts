/**
 * `<PTOP>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PTOP>`. Placeholder: no fields yet. */
export type Ptop = Record<PropertyKey, never>;

/** Codec for `<PTOP>`. Placeholder: no fields yet. */
export const ptop: XmlParam<"PTOP", Ptop> = xmlParam(
  "PTOP",
  {},
);
