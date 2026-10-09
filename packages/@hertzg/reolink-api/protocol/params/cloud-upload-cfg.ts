/**
 * `<CloudUploadCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<CloudUploadCfg>`. Placeholder: no fields yet. */
export type CloudUploadCfg = Record<PropertyKey, never>;

/** Codec for `<CloudUploadCfg>`. Placeholder: no fields yet. */
export const cloudUploadCfg: XmlParam<"CloudUploadCfg", CloudUploadCfg> =
  xmlParam(
    "CloudUploadCfg",
    {},
  );
