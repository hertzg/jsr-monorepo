/**
 * `<TalkAbility>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<TalkAbility>`. Placeholder: no fields yet. */
export type TalkAbility = Record<PropertyKey, never>;

/** Codec for `<TalkAbility>`. Placeholder: no fields yet. */
export const talkAbility: XmlParam<"TalkAbility", TalkAbility> = xmlParam(
  "TalkAbility",
  {},
);
