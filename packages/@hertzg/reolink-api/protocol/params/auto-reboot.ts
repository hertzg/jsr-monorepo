/**
 * `<AutoReboot>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AutoReboot>`. Placeholder: no fields yet. */
export type AutoReboot = Record<PropertyKey, never>;

/** Codec for `<AutoReboot>`. Placeholder: no fields yet. */
export const autoReboot: XmlParam<"AutoReboot", AutoReboot> = xmlParam(
  "AutoReboot",
  {},
);
