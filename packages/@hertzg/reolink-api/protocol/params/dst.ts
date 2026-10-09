/**
 * `<Dst>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Dst>`. Placeholder: no fields yet. */
export type Dst = Record<PropertyKey, never>;

/** Codec for `<Dst>`. Placeholder: no fields yet. */
export const dst: XmlParam<"Dst", Dst> = xmlParam(
  "Dst",
  {},
);
