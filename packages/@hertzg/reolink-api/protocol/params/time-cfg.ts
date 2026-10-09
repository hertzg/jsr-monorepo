/**
 * `<TimeCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<TimeCfg>`. Placeholder: no fields yet. */
export type TimeCfg = Record<PropertyKey, never>;

/** Codec for `<TimeCfg>`. Placeholder: no fields yet. */
export const timeCfg: XmlParam<"TimeCfg", TimeCfg> = xmlParam(
  "TimeCfg",
  {},
);
