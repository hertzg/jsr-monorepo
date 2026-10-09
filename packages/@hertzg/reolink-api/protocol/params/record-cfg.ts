/**
 * `<RecordCfg>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<RecordCfg>`. Placeholder: no fields yet. */
export type RecordCfg = Record<PropertyKey, never>;

/** Codec for `<RecordCfg>`. Placeholder: no fields yet. */
export const recordCfg: XmlParam<"RecordCfg", RecordCfg> = xmlParam(
  "RecordCfg",
  {},
);
