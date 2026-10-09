/**
 * `<AfLearn>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AfLearn>`. Placeholder: no fields yet. */
export type AfLearn = Record<PropertyKey, never>;

/** Codec for `<AfLearn>`. Placeholder: no fields yet. */
export const afLearn: XmlParam<"AfLearn", AfLearn> = xmlParam(
  "AfLearn",
  {},
);
