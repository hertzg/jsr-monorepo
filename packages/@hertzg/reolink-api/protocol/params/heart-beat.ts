/**
 * `<HeartBeat>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<HeartBeat>`. Placeholder: no fields yet. */
export type HeartBeat = Record<PropertyKey, never>;

/** Codec for `<HeartBeat>`. Placeholder: no fields yet. */
export const heartBeat: XmlParam<"HeartBeat", HeartBeat> = xmlParam(
  "HeartBeat",
  {},
);
