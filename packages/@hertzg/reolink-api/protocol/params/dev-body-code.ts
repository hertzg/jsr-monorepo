/**
 * `<DevBodyCode>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<DevBodyCode>`. Placeholder: no fields yet. */
export type DevBodyCode = Record<PropertyKey, never>;

/** Codec for `<DevBodyCode>`. Placeholder: no fields yet. */
export const devBodyCode: XmlParam<"DevBodyCode", DevBodyCode> = xmlParam(
  "DevBodyCode",
  {},
);
