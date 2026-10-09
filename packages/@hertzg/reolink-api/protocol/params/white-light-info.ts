/**
 * `<whiteLightInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<whiteLightInfo>`. Placeholder: no fields yet. */
export type WhiteLightInfo = Record<PropertyKey, never>;

/** Codec for `<whiteLightInfo>`. Placeholder: no fields yet. */
export const whiteLightInfo: XmlParam<"whiteLightInfo", WhiteLightInfo> =
  xmlParam(
    "whiteLightInfo",
    {},
  );
