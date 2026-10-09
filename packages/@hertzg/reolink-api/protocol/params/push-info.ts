/**
 * `<PushInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<PushInfo>`. Placeholder: no fields yet. */
export type PushInfo = Record<PropertyKey, never>;

/** Codec for `<PushInfo>`. Placeholder: no fields yet. */
export const pushInfo: XmlParam<"PushInfo", PushInfo> = xmlParam(
  "PushInfo",
  {},
);
