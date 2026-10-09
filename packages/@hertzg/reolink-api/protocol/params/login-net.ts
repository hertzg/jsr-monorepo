/**
 * `<LoginNet>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<LoginNet>`. Placeholder: no fields yet. */
export type LoginNet = Record<PropertyKey, never>;

/** Codec for `<LoginNet>`. Placeholder: no fields yet. */
export const loginNet: XmlParam<"LoginNet", LoginNet> = xmlParam(
  "LoginNet",
  {},
);
