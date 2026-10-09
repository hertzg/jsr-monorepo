/**
 * `<RtspPort>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<RtspPort>`. Placeholder: no fields yet. */
export type RtspPort = Record<PropertyKey, never>;

/** Codec for `<RtspPort>`. Placeholder: no fields yet. */
export const rtspPort: XmlParam<"RtspPort", RtspPort> = xmlParam(
  "RtspPort",
  {},
);
