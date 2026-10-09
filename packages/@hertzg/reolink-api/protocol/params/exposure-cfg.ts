/**
 * `<ExposureCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ExposureCfg>`. Placeholder: no fields yet. */
export type ExposureCfg = Record<PropertyKey, never>;

/** Codec for `<ExposureCfg>`. Placeholder: no fields yet. */
export const exposureCfg: XmlParam<"ExposureCfg", ExposureCfg> = xmlParam(
  "ExposureCfg",
  {},
);
