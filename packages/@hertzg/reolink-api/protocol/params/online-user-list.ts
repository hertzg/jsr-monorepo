/**
 * `<OnlineUserList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<OnlineUserList>`. Placeholder: no fields yet. */
export type OnlineUserList = Record<PropertyKey, never>;

/** Codec for `<OnlineUserList>`. Placeholder: no fields yet. */
export const onlineUserList: XmlParam<"OnlineUserList", OnlineUserList> =
  xmlParam(
    "OnlineUserList",
    {},
  );
