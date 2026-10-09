/**
 * `<BindUnbindNas>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<BindUnbindNas>`. Placeholder: no fields yet. */
export type BindUnbindNas = Record<PropertyKey, never>;

/** Codec for `<BindUnbindNas>`. Placeholder: no fields yet. */
export const bindUnbindNas: XmlParam<"BindUnbindNas", BindUnbindNas> = xmlParam(
  "BindUnbindNas",
  {},
);
