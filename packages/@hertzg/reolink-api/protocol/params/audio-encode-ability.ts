/**
 * `<AudioEncodeAbility>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AudioEncodeAbility>`. Placeholder: no fields yet. */
export type AudioEncodeAbility = Record<PropertyKey, never>;

/** Codec for `<AudioEncodeAbility>`. Placeholder: no fields yet. */
export const audioEncodeAbility: XmlParam<
  "AudioEncodeAbility",
  AudioEncodeAbility
> = xmlParam(
  "AudioEncodeAbility",
  {},
);
