/**
 * `<PushTask>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PushTask>`. Placeholder: no fields yet. */
export type PushTask = Record<PropertyKey, never>;

/** Codec for `<PushTask>`. Placeholder: no fields yet. */
export const pushTask: XmlParam<"PushTask", PushTask> = xmlParam(
  "PushTask",
  {},
);
