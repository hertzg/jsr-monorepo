/**
 * `<GopCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<GopCfg>`. Placeholder: no fields yet. */
export type GopCfg = Record<PropertyKey, never>;

/** Codec for `<GopCfg>`. Placeholder: no fields yet. */
export const gopCfg: XmlParam<"GopCfg", GopCfg> = xmlParam(
  "GopCfg",
  {},
);
