/**
 * `<timelapseCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseCfg>`. Placeholder: no fields yet. */
export type TimelapseCfg = Record<PropertyKey, never>;

/** Codec for `<timelapseCfg>`. Placeholder: no fields yet. */
export const timelapseCfg: XmlParam<"timelapseCfg", TimelapseCfg> = xmlParam(
  "timelapseCfg",
  {},
);
