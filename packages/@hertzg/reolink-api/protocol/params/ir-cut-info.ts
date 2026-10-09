/**
 * `<IrCutInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<IrCutInfo>`. Placeholder: no fields yet. */
export type IrCutInfo = Record<PropertyKey, never>;

/** Codec for `<IrCutInfo>`. Placeholder: no fields yet. */
export const irCutInfo: XmlParam<"IrCutInfo", IrCutInfo> = xmlParam(
  "IrCutInfo",
  {},
);
