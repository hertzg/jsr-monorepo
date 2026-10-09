/**
 * `<PARAM_DATA_V20>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PARAM_DATA_V20>`. Placeholder: no fields yet. */
export type ParamDataV20 = Record<PropertyKey, never>;

/** Codec for `<PARAM_DATA_V20>`. Placeholder: no fields yet. */
export const paramDataV20: XmlParam<"PARAM_DATA_V20", ParamDataV20> = xmlParam(
  "PARAM_DATA_V20",
  {},
);
