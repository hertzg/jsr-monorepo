/**
 * `<AiCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AiCfg>`. Placeholder: no fields yet. */
export type AiCfg = Record<PropertyKey, never>;

/** Codec for `<AiCfg>`. Placeholder: no fields yet. */
export const aiCfg: XmlParam<"AiCfg", AiCfg> = xmlParam(
  "AiCfg",
  {},
);
