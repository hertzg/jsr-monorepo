/**
 * `<LedState>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<LedState>`. Placeholder: no fields yet. */
export type LedState = Record<PropertyKey, never>;

/** Codec for `<LedState>`. Placeholder: no fields yet. */
export const ledState: XmlParam<"LedState", LedState> = xmlParam(
  "LedState",
  {},
);
