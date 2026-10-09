/**
 * `<BandWidthTest>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BandWidthTest>`. Placeholder: no fields yet. */
export type BandWidthTest = Record<PropertyKey, never>;

/** Codec for `<BandWidthTest>`. Placeholder: no fields yet. */
export const bandWidthTest: XmlParam<"BandWidthTest", BandWidthTest> = xmlParam(
  "BandWidthTest",
  {},
);
