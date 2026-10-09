/**
 * `<ScanAp>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ScanAp>`. Placeholder: no fields yet. */
export type ScanAp = Record<PropertyKey, never>;

/** Codec for `<ScanAp>`. Placeholder: no fields yet. */
export const scanAp: XmlParam<"ScanAp", ScanAp> = xmlParam(
  "ScanAp",
  {},
);
