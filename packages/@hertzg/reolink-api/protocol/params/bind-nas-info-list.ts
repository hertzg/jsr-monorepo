/**
 * `<BindNasInfoList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BindNasInfoList>`. Placeholder: no fields yet. */
export type BindNasInfoList = Record<PropertyKey, never>;

/** Codec for `<BindNasInfoList>`. Placeholder: no fields yet. */
export const bindNasInfoList: XmlParam<"BindNasInfoList", BindNasInfoList> =
  xmlParam(
    "BindNasInfoList",
    {},
  );
