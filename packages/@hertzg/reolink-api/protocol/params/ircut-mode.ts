/**
 * `<IrcutMode>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IrcutMode>`. Placeholder: no fields yet. */
export type IrcutMode = Record<PropertyKey, never>;

/** Codec for `<IrcutMode>`. Placeholder: no fields yet. */
export const ircutMode: XmlParam<"IrcutMode", IrcutMode> = xmlParam(
  "IrcutMode",
  {},
);
