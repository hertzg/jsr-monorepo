/**
 * `<IOTBindInfoList>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IOTBindInfoList>`. Placeholder: no fields yet. */
export type IotBindInfoList = Record<PropertyKey, never>;

/** Codec for `<IOTBindInfoList>`. Placeholder: no fields yet. */
export const iotBindInfoList: XmlParam<"IOTBindInfoList", IotBindInfoList> =
  xmlParam(
    "IOTBindInfoList",
    {},
  );
