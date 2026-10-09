/**
 * `<Ntp>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Ntp>`. Placeholder: no fields yet. */
export type Ntp = Record<PropertyKey, never>;

/** Codec for `<Ntp>`. Placeholder: no fields yet. */
export const ntp: XmlParam<"Ntp", Ntp> = xmlParam(
  "Ntp",
  {},
);
