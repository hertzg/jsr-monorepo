/**
 * `<BindCloud>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BindCloud>`. Placeholder: no fields yet. */
export type BindCloud = Record<PropertyKey, never>;

/** Codec for `<BindCloud>`. Placeholder: no fields yet. */
export const bindCloud: XmlParam<"BindCloud", BindCloud> = xmlParam(
  "BindCloud",
  {},
);
