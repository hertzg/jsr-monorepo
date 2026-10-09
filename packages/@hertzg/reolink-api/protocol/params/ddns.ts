/**
 * `<Ddns>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Ddns>`. Placeholder: no fields yet. */
export type Ddns = Record<PropertyKey, never>;

/** Codec for `<Ddns>`. Placeholder: no fields yet. */
export const ddns: XmlParam<"Ddns", Ddns> = xmlParam(
  "Ddns",
  {},
);
