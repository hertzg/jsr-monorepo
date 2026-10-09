/**
 * `<PtzGuard>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PtzGuard>`. Placeholder: no fields yet. */
export type PtzGuard = Record<PropertyKey, never>;

/** Codec for `<PtzGuard>`. Placeholder: no fields yet. */
export const ptzGuard: XmlParam<"PtzGuard", PtzGuard> = xmlParam(
  "PtzGuard",
  {},
);
