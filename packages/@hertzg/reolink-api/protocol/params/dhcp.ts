/**
 * `<Dhcp>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Dhcp>`. Placeholder: no fields yet. */
export type Dhcp = Record<PropertyKey, never>;

/** Codec for `<Dhcp>`. Placeholder: no fields yet. */
export const dhcp: XmlParam<"Dhcp", Dhcp> = xmlParam(
  "Dhcp",
  {},
);
