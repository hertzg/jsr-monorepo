/**
 * `<ConfigFileInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ConfigFileInfo>`. Placeholder: no fields yet. */
export type ConfigFileInfo = Record<PropertyKey, never>;

/** Codec for `<ConfigFileInfo>`. Placeholder: no fields yet. */
export const configFileInfo: XmlParam<"ConfigFileInfo", ConfigFileInfo> =
  xmlParam(
    "ConfigFileInfo",
    {},
  );
