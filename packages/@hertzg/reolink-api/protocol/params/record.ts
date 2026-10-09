/**
 * `<Record>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/**
 * The value of `<Record>`. Named `RecordParam` so it does not shadow the
 * built-in `Record`. Placeholder: no fields yet.
 */
export type RecordParam = Record<PropertyKey, never>;

/** Codec for `<Record>`. Placeholder: no fields yet. */
export const record: XmlParam<"Record", RecordParam> = xmlParam(
  "Record",
  {},
);
