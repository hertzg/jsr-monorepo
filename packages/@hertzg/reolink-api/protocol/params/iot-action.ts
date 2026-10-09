/**
 * `<IOTAction>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IOTAction>`. Placeholder: no fields yet. */
export type IotAction = Record<PropertyKey, never>;

/** Codec for `<IOTAction>`. Placeholder: no fields yet. */
export const iotAction: XmlParam<"IOTAction", IotAction> = xmlParam(
  "IOTAction",
  {},
);
