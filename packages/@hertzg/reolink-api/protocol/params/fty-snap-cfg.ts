/**
 * `<ftySnapCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ftySnapCfg>`. Placeholder: no fields yet. */
export type FtySnapCfg = Record<PropertyKey, never>;

/** Codec for `<ftySnapCfg>`. Placeholder: no fields yet. */
export const ftySnapCfg: XmlParam<"ftySnapCfg", FtySnapCfg> = xmlParam(
  "ftySnapCfg",
  {},
);
