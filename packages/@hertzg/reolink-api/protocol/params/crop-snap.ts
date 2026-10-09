/**
 * `<CropSnap>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<CropSnap>`. Placeholder: no fields yet. */
export type CropSnap = Record<PropertyKey, never>;

/** Codec for `<CropSnap>`. Placeholder: no fields yet. */
export const cropSnap: XmlParam<"CropSnap", CropSnap> = xmlParam(
  "CropSnap",
  {},
);
