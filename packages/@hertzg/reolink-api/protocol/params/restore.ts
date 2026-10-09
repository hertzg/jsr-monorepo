/**
 * `<Restore>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Restore>`. Placeholder: no fields yet. */
export type Restore = Record<PropertyKey, never>;

/** Codec for `<Restore>`. Placeholder: no fields yet. */
export const restore: XmlParam<"Restore", Restore> = xmlParam(
  "Restore",
  {},
);
