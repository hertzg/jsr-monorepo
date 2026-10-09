/**
 * `<PushCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PushCfg>`. Placeholder: no fields yet. */
export type PushCfg = Record<PropertyKey, never>;

/** Codec for `<PushCfg>`. Placeholder: no fields yet. */
export const pushCfg: XmlParam<"PushCfg", PushCfg> = xmlParam(
  "PushCfg",
  {},
);
