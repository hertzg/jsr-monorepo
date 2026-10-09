/**
 * `<ChargeBatteryInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ChargeBatteryInfo>`. Placeholder: no fields yet. */
export type ChargeBatteryInfo = Record<PropertyKey, never>;

/** Codec for `<ChargeBatteryInfo>`. Placeholder: no fields yet. */
export const chargeBatteryInfo: XmlParam<
  "ChargeBatteryInfo",
  ChargeBatteryInfo
> = xmlParam(
  "ChargeBatteryInfo",
  {},
);
