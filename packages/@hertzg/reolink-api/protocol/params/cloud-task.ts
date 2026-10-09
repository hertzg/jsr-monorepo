/**
 * `<CloudTask>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<CloudTask>`. Placeholder: no fields yet. */
export type CloudTask = Record<PropertyKey, never>;

/** Codec for `<CloudTask>`. Placeholder: no fields yet. */
export const cloudTask: XmlParam<"CloudTask", CloudTask> = xmlParam(
  "CloudTask",
  {},
);
