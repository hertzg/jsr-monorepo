/**
 * `<AlarmArea>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AlarmArea>`. Placeholder: no fields yet. */
export type AlarmArea = Record<PropertyKey, never>;

/** Codec for `<AlarmArea>`. Placeholder: no fields yet. */
export const alarmArea: XmlParam<"AlarmArea", AlarmArea> = xmlParam(
  "AlarmArea",
  {},
);
