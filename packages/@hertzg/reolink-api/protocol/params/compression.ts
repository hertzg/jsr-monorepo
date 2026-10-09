/**
 * `<Compression>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Compression>`. Placeholder: no fields yet. */
export type Compression = Record<PropertyKey, never>;

/** Codec for `<Compression>`. Placeholder: no fields yet. */
export const compression: XmlParam<"Compression", Compression> = xmlParam(
  "Compression",
  {},
);
