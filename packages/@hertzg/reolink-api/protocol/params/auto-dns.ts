/**
 * `<AutoDns>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AutoDns>`. Placeholder: no fields yet. */
export type AutoDns = Record<PropertyKey, never>;

/** Codec for `<AutoDns>`. Placeholder: no fields yet. */
export const autoDns: XmlParam<"AutoDns", AutoDns> = xmlParam(
  "AutoDns",
  {},
);
