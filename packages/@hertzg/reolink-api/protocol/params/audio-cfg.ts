/**
 * `<audioCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<audioCfg>`. Placeholder: no fields yet. */
export type AudioCfg = Record<PropertyKey, never>;

/** Codec for `<audioCfg>`. Placeholder: no fields yet. */
export const audioCfg: XmlParam<"audioCfg", AudioCfg> = xmlParam(
  "audioCfg",
  {},
);
