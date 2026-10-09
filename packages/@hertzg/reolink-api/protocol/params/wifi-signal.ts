/**
 * `<WifiSignal>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<WifiSignal>`. Placeholder: no fields yet. */
export type WifiSignal = Record<PropertyKey, never>;

/** Codec for `<WifiSignal>`. Placeholder: no fields yet. */
export const wifiSignal: XmlParam<"WifiSignal", WifiSignal> = xmlParam(
  "WifiSignal",
  {},
);
