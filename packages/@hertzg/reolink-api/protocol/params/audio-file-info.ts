/**
 * `<audioFileInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<audioFileInfo>`. Placeholder: no fields yet. */
export type AudioFileInfo = Record<PropertyKey, never>;

/** Codec for `<audioFileInfo>`. Placeholder: no fields yet. */
export const audioFileInfo: XmlParam<"audioFileInfo", AudioFileInfo> = xmlParam(
  "audioFileInfo",
  {},
);
