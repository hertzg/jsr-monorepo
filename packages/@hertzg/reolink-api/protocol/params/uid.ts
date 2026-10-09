/**
 * `<Uid>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Uid>`. Placeholder: no fields yet. */
export type Uid = Record<PropertyKey, never>;

/** Codec for `<Uid>`. Placeholder: no fields yet. */
export const uid: XmlParam<"Uid", Uid> = xmlParam(
  "Uid",
  {},
);
