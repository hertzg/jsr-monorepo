/**
 * `<FloodlightTask>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<FloodlightTask>`. Placeholder: no fields yet. */
export type FloodlightTask = Record<PropertyKey, never>;

/** Codec for `<FloodlightTask>`. Placeholder: no fields yet. */
export const floodlightTask: XmlParam<"FloodlightTask", FloodlightTask> =
  xmlParam(
    "FloodlightTask",
    {},
  );
