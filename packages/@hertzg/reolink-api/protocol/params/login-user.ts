/**
 * `<LoginUser>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<LoginUser>`. Placeholder: no fields yet. */
export type LoginUser = Record<PropertyKey, never>;

/** Codec for `<LoginUser>`. Placeholder: no fields yet. */
export const loginUser: XmlParam<"LoginUser", LoginUser> = xmlParam(
  "LoginUser",
  {},
);
