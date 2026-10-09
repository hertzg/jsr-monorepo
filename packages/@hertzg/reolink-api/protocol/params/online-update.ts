/**
 * `<OnlineUpdate>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<OnlineUpdate>`. Placeholder: no fields yet. */
export type OnlineUpdate = Record<PropertyKey, never>;

/** Codec for `<OnlineUpdate>`. Placeholder: no fields yet. */
export const onlineUpdate: XmlParam<"OnlineUpdate", OnlineUpdate> = xmlParam(
  "OnlineUpdate",
  {},
);
