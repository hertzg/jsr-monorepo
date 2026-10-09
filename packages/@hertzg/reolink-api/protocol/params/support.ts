/**
 * `<Support>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Support>`. Placeholder: no fields yet. */
export type Support = Record<PropertyKey, never>;

/** Codec for `<Support>`. Placeholder: no fields yet. */
export const support: XmlParam<"Support", Support> = xmlParam(
  "Support",
  {},
);
