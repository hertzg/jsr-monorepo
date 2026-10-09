/**
 * `<AfLearnRes>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AfLearnRes>`. Placeholder: no fields yet. */
export type AfLearnRes = Record<PropertyKey, never>;

/** Codec for `<AfLearnRes>`. Placeholder: no fields yet. */
export const afLearnRes: XmlParam<"AfLearnRes", AfLearnRes> = xmlParam(
  "AfLearnRes",
  {},
);
