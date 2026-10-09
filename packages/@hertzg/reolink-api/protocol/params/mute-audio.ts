/**
 * `<muteAudio>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<muteAudio>`. Placeholder: no fields yet. */
export type MuteAudio = Record<PropertyKey, never>;

/** Codec for `<muteAudio>`. Placeholder: no fields yet. */
export const muteAudio: XmlParam<"muteAudio", MuteAudio> = xmlParam(
  "muteAudio",
  {},
);
