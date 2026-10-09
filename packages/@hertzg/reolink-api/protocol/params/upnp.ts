/**
 * `<Upnp>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Upnp>`. Placeholder: no fields yet. */
export type Upnp = Record<PropertyKey, never>;

/** Codec for `<Upnp>`. Placeholder: no fields yet. */
export const upnp: XmlParam<"Upnp", Upnp> = xmlParam(
  "Upnp",
  {},
);
