/**
 * `<MD>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<MD>`. Placeholder: no fields yet. */
export type Md = Record<PropertyKey, never>;

/** Codec for `<MD>`. Placeholder: no fields yet. */
export const md: XmlParam<"MD", Md> = xmlParam(
  "MD",
  {},
);
