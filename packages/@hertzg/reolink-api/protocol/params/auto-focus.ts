/**
 * `<AutoFocus>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AutoFocus>`. Placeholder: no fields yet. */
export type AutoFocus = Record<PropertyKey, never>;

/** Codec for `<AutoFocus>`. Placeholder: no fields yet. */
export const autoFocus: XmlParam<"AutoFocus", AutoFocus> = xmlParam(
  "AutoFocus",
  {},
);
