/**
 * `<SystemGeneral>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<SystemGeneral>`. Placeholder: no fields yet. */
export type SystemGeneral = Record<PropertyKey, never>;

/** Codec for `<SystemGeneral>`. Placeholder: no fields yet. */
export const systemGeneral: XmlParam<"SystemGeneral", SystemGeneral> = xmlParam(
  "SystemGeneral",
  {},
);
