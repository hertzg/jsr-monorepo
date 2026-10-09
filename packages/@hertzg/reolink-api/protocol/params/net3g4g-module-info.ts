/**
 * `<Net3g4gModuleInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Net3g4gModuleInfo>`. Placeholder: no fields yet. */
export type Net3g4gModuleInfo = Record<PropertyKey, never>;

/** Codec for `<Net3g4gModuleInfo>`. Placeholder: no fields yet. */
export const net3g4gModuleInfo: XmlParam<
  "Net3g4gModuleInfo",
  Net3g4gModuleInfo
> = xmlParam(
  "Net3g4gModuleInfo",
  {},
);
