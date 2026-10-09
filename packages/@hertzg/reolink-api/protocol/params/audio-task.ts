/**
 * `<AudioTask>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AudioTask>`. Placeholder: no fields yet. */
export type AudioTask = Record<PropertyKey, never>;

/** Codec for `<AudioTask>`. Placeholder: no fields yet. */
export const audioTask: XmlParam<"AudioTask", AudioTask> = xmlParam(
  "AudioTask",
  {},
);
