/**
 * `<Net3g4gInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Net3g4gInfo>`. Placeholder: no fields yet. */
export type Net3g4gInfo = Record<PropertyKey, never>;

/** Codec for `<Net3g4gInfo>`. Placeholder: no fields yet. */
export const net3g4gInfo: XmlParam<"Net3g4gInfo", Net3g4gInfo> = xmlParam(
  "Net3g4gInfo",
  {},
);
