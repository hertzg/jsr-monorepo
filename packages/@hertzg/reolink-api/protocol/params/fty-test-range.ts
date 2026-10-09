/**
 * `<ftyTestRange>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ftyTestRange>`. Placeholder: no fields yet. */
export type FtyTestRange = Record<PropertyKey, never>;

/** Codec for `<ftyTestRange>`. Placeholder: no fields yet. */
export const ftyTestRange: XmlParam<"ftyTestRange", FtyTestRange> = xmlParam(
  "ftyTestRange",
  {},
);
