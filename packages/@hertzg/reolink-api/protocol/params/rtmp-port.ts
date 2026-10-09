/**
 * `<RtmpPort>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<RtmpPort>`. Placeholder: no fields yet. */
export type RtmpPort = Record<PropertyKey, never>;

/** Codec for `<RtmpPort>`. Placeholder: no fields yet. */
export const rtmpPort: XmlParam<"RtmpPort", RtmpPort> = xmlParam(
  "RtmpPort",
  {},
);
