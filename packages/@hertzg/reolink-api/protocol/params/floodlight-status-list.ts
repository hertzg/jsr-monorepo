/**
 * `<FloodlightStatusList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<FloodlightStatusList>`. Placeholder: no fields yet. */
export type FloodlightStatusList = Record<PropertyKey, never>;

/** Codec for `<FloodlightStatusList>`. Placeholder: no fields yet. */
export const floodlightStatusList: XmlParam<
  "FloodlightStatusList",
  FloodlightStatusList
> = xmlParam(
  "FloodlightStatusList",
  {},
);
