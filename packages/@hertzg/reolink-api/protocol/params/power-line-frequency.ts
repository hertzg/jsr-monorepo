/**
 * `<PowerLineFrequency>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PowerLineFrequency>`. Placeholder: no fields yet. */
export type PowerLineFrequency = Record<PropertyKey, never>;

/** Codec for `<PowerLineFrequency>`. Placeholder: no fields yet. */
export const powerLineFrequency: XmlParam<
  "PowerLineFrequency",
  PowerLineFrequency
> = xmlParam(
  "PowerLineFrequency",
  {},
);
