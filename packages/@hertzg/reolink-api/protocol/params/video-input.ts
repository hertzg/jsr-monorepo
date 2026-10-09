/**
 * `<VideoInput>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<VideoInput>`. Placeholder: no fields yet. */
export type VideoInput = Record<PropertyKey, never>;

/** Codec for `<VideoInput>`. Placeholder: no fields yet. */
export const videoInput: XmlParam<"VideoInput", VideoInput> = xmlParam(
  "VideoInput",
  {},
);
