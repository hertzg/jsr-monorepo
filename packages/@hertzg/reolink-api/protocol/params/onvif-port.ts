/**
 * `<OnvifPort>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<OnvifPort>`. Placeholder: no fields yet. */
export type OnvifPort = Record<PropertyKey, never>;

/** Codec for `<OnvifPort>`. Placeholder: no fields yet. */
export const onvifPort: XmlParam<"OnvifPort", OnvifPort> = xmlParam(
  "OnvifPort",
  {},
);
