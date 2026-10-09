/**
 * `<HddInfoList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<HddInfoList>`. Placeholder: no fields yet. */
export type HddInfoList = Record<PropertyKey, never>;

/** Codec for `<HddInfoList>`. Placeholder: no fields yet. */
export const hddInfoList: XmlParam<"HddInfoList", HddInfoList> = xmlParam(
  "HddInfoList",
  {},
);
