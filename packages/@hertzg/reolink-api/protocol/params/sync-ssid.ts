/**
 * `<syncSSID>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<syncSSID>`. Placeholder: no fields yet. */
export type SyncSsid = Record<PropertyKey, never>;

/** Codec for `<syncSSID>`. Placeholder: no fields yet. */
export const syncSsid: XmlParam<"syncSSID", SyncSsid> = xmlParam(
  "syncSSID",
  {},
);
