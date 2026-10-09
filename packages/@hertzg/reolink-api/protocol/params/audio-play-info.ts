/**
 * `<audioPlayInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<audioPlayInfo>`. Placeholder: no fields yet. */
export type AudioPlayInfo = Record<PropertyKey, never>;

/** Codec for `<audioPlayInfo>`. Placeholder: no fields yet. */
export const audioPlayInfo: XmlParam<"audioPlayInfo", AudioPlayInfo> = xmlParam(
  "audioPlayInfo",
  {},
);
