/**
 * `<Ftp>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Ftp>`. Placeholder: no fields yet. */
export type Ftp = Record<PropertyKey, never>;

/** Codec for `<Ftp>`. Placeholder: no fields yet. */
export const ftp: XmlParam<"Ftp", Ftp> = xmlParam(
  "Ftp",
  {},
);
