/**
 * `<timelapseTasks>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseTasks>`. Placeholder: no fields yet. */
export type TimelapseTasks = Record<PropertyKey, never>;

/** Codec for `<timelapseTasks>`. Placeholder: no fields yet. */
export const timelapseTasks: XmlParam<"timelapseTasks", TimelapseTasks> =
  xmlParam(
    "timelapseTasks",
    {},
  );
