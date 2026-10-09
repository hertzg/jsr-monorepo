/**
 * `<OsdDatetime>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<OsdDatetime>`. Placeholder: no fields yet. */
export type OsdDatetime = Record<PropertyKey, never>;

/** Codec for `<OsdDatetime>`. Placeholder: no fields yet. */
export const osdDatetime: XmlParam<"OsdDatetime", OsdDatetime> = xmlParam(
  "OsdDatetime",
  {},
);
