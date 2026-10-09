/**
 * `<HddInitList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<HddInitList>`. Placeholder: no fields yet. */
export type HddInitList = Record<PropertyKey, never>;

/** Codec for `<HddInitList>`. Placeholder: no fields yet. */
export const hddInitList: XmlParam<"HddInitList", HddInitList> = xmlParam(
  "HddInitList",
  {},
);
