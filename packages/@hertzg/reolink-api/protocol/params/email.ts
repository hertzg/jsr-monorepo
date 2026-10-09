/**
 * `<Email>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Email>`. Placeholder: no fields yet. */
export type Email = Record<PropertyKey, never>;

/** Codec for `<Email>`. Placeholder: no fields yet. */
export const email: XmlParam<"Email", Email> = xmlParam(
  "Email",
  {},
);
