/**
 * `<ptzCurPos>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ptzCurPos>`. Placeholder: no fields yet. */
export type PtzCurPos = Record<PropertyKey, never>;

/** Codec for `<ptzCurPos>`. Placeholder: no fields yet. */
export const ptzCurPos: XmlParam<"ptzCurPos", PtzCurPos> = xmlParam(
  "ptzCurPos",
  {},
);
