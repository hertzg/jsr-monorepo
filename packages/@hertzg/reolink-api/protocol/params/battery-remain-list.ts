/**
 * `<BatteryRemainList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BatteryRemainList>`. Placeholder: no fields yet. */
export type BatteryRemainList = Record<PropertyKey, never>;

/** Codec for `<BatteryRemainList>`. Placeholder: no fields yet. */
export const batteryRemainList: XmlParam<
  "BatteryRemainList",
  BatteryRemainList
> = xmlParam(
  "BatteryRemainList",
  {},
);
