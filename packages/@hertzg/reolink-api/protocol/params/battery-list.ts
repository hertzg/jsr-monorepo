/**
 * `<BatteryList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BatteryList>`. Placeholder: no fields yet. */
export type BatteryList = Record<PropertyKey, never>;

/** Codec for `<BatteryList>`. Placeholder: no fields yet. */
export const batteryList: XmlParam<"BatteryList", BatteryList> = xmlParam(
  "BatteryList",
  {},
);
