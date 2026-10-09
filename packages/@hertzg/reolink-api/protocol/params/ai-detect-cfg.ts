/**
 * `<AiDetectCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AiDetectCfg>`. Placeholder: no fields yet. */
export type AiDetectCfg = Record<PropertyKey, never>;

/** Codec for `<AiDetectCfg>`. Placeholder: no fields yet. */
export const aiDetectCfg: XmlParam<"AiDetectCfg", AiDetectCfg> = xmlParam(
  "AiDetectCfg",
  {},
);
