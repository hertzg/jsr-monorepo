/**
 * `<NasUploadCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<NasUploadCfg>`. Placeholder: no fields yet. */
export type NasUploadCfg = Record<PropertyKey, never>;

/** Codec for `<NasUploadCfg>`. Placeholder: no fields yet. */
export const nasUploadCfg: XmlParam<"NasUploadCfg", NasUploadCfg> = xmlParam(
  "NasUploadCfg",
  {},
);
