/**
 * `<AbilityInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AbilityInfo>`. Placeholder: no fields yet. */
export type AbilityInfo = Record<PropertyKey, never>;

/** Codec for `<AbilityInfo>`. Placeholder: no fields yet. */
export const abilityInfo: XmlParam<"AbilityInfo", AbilityInfo> = xmlParam(
  "AbilityInfo",
  {},
);
