/**
 * `<Wifi>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Wifi>`. Placeholder: no fields yet. */
export type Wifi = Record<PropertyKey, never>;

/** Codec for `<Wifi>`. Placeholder: no fields yet. */
export const wifi: XmlParam<"Wifi", Wifi> = xmlParam(
  "Wifi",
  {},
);
