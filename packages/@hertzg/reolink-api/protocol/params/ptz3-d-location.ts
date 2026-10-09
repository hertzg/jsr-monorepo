/**
 * `<Ptz3DLocation>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Ptz3DLocation>`. Placeholder: no fields yet. */
export type Ptz3DLocation = Record<PropertyKey, never>;

/** Codec for `<Ptz3DLocation>`. Placeholder: no fields yet. */
export const ptz3DLocation: XmlParam<"Ptz3DLocation", Ptz3DLocation> = xmlParam(
  "Ptz3DLocation",
  {},
);
