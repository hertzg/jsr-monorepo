/**
 * `<Mirror>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Mirror>`. Placeholder: no fields yet. */
export type Mirror = Record<PropertyKey, never>;

/** Codec for `<Mirror>`. Placeholder: no fields yet. */
export const mirror: XmlParam<"Mirror", Mirror> = xmlParam(
  "Mirror",
  {},
);
