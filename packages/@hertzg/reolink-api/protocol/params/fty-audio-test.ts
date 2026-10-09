/**
 * `<ftyAudioTest>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ftyAudioTest>`. Placeholder: no fields yet. */
export type FtyAudioTest = Record<PropertyKey, never>;

/** Codec for `<ftyAudioTest>`. Placeholder: no fields yet. */
export const ftyAudioTest: XmlParam<"ftyAudioTest", FtyAudioTest> = xmlParam(
  "ftyAudioTest",
  {},
);
