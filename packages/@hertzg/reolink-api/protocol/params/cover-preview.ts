/**
 * `<CoverPreview>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<CoverPreview>`. Placeholder: no fields yet. */
export type CoverPreview = Record<PropertyKey, never>;

/** Codec for `<CoverPreview>`. Placeholder: no fields yet. */
export const coverPreview: XmlParam<"CoverPreview", CoverPreview> = xmlParam(
  "CoverPreview",
  {},
);
