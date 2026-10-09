/**
 * `<InputAdvanceCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<InputAdvanceCfg>`. Placeholder: no fields yet. */
export type InputAdvanceCfg = Record<PropertyKey, never>;

/** Codec for `<InputAdvanceCfg>`. Placeholder: no fields yet. */
export const inputAdvanceCfg: XmlParam<"InputAdvanceCfg", InputAdvanceCfg> =
  xmlParam(
    "InputAdvanceCfg",
    {},
  );
