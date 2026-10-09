/**
 * `<Ip>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Ip>`. Placeholder: no fields yet. */
export type Ip = Record<PropertyKey, never>;

/** Codec for `<Ip>`. Placeholder: no fields yet. */
export const ip: XmlParam<"Ip", Ip> = xmlParam(
  "Ip",
  {},
);
