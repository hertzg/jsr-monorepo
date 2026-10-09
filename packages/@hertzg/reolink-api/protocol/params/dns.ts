/**
 * `<Dns>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Dns>`. Placeholder: no fields yet. */
export type Dns = Record<PropertyKey, never>;

/** Codec for `<Dns>`. Placeholder: no fields yet. */
export const dns: XmlParam<"Dns", Dns> = xmlParam(
  "Dns",
  {},
);
