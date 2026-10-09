/**
 * `<AlarmEventList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AlarmEventList>`. Placeholder: no fields yet. */
export type AlarmEventList = Record<PropertyKey, never>;

/** Codec for `<AlarmEventList>`. Placeholder: no fields yet. */
export const alarmEventList: XmlParam<"AlarmEventList", AlarmEventList> =
  xmlParam(
    "AlarmEventList",
    {},
  );
