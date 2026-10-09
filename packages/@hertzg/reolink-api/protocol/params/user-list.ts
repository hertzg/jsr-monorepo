/**
 * `<UserList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<UserList>`. Placeholder: no fields yet. */
export type UserList = Record<PropertyKey, never>;

/** Codec for `<UserList>`. Placeholder: no fields yet. */
export const userList: XmlParam<"UserList", UserList> = xmlParam(
  "UserList",
  {},
);
