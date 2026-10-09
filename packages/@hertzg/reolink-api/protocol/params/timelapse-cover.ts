/**
 * `<timelapseCover>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseCover>`. Placeholder: no fields yet. */
export type TimelapseCover = Record<PropertyKey, never>;

/** Codec for `<timelapseCover>`. Placeholder: no fields yet. */
export const timelapseCover: XmlParam<"timelapseCover", TimelapseCover> =
  xmlParam(
    "timelapseCover",
    {},
  );
