/**
 * `<IOTBindUnBind>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IOTBindUnBind>`. Placeholder: no fields yet. */
export type IotBindUnBind = Record<PropertyKey, never>;

/** Codec for `<IOTBindUnBind>`. Placeholder: no fields yet. */
export const iotBindUnBind: XmlParam<"IOTBindUnBind", IotBindUnBind> = xmlParam(
  "IOTBindUnBind",
  {},
);
