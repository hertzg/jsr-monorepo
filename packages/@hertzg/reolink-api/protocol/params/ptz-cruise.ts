/**
 * `<PtzCruise>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PtzCruise>`. Placeholder: no fields yet. */
export type PtzCruise = Record<PropertyKey, never>;

/** Codec for `<PtzCruise>`. Placeholder: no fields yet. */
export const ptzCruise: XmlParam<"PtzCruise", PtzCruise> = xmlParam(
  "PtzCruise",
  {},
);
