/**
 * `<TalkConfig>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<TalkConfig>`. Placeholder: no fields yet. */
export type TalkConfig = Record<PropertyKey, never>;

/** Codec for `<TalkConfig>`. Placeholder: no fields yet. */
export const talkConfig: XmlParam<"TalkConfig", TalkConfig> = xmlParam(
  "TalkConfig",
  {},
);
