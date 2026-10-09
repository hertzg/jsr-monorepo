/**
 * `<SmtPlayUrl>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<SmtPlayUrl>`. Placeholder: no fields yet. */
export type SmtPlayUrl = Record<PropertyKey, never>;

/** Codec for `<SmtPlayUrl>`. Placeholder: no fields yet. */
export const smtPlayUrl: XmlParam<"SmtPlayUrl", SmtPlayUrl> = xmlParam(
  "SmtPlayUrl",
  {},
);
