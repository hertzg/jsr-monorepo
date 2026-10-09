/**
 * `<ZfBacklash>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ZfBacklash>`. Placeholder: no fields yet. */
export type ZfBacklash = Record<PropertyKey, never>;

/** Codec for `<ZfBacklash>`. Placeholder: no fields yet. */
export const zfBacklash: XmlParam<"ZfBacklash", ZfBacklash> = xmlParam(
  "ZfBacklash",
  {},
);
