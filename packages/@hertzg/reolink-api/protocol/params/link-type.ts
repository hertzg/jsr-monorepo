/**
 * `<LinkType>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<LinkType>`. Placeholder: no fields yet. */
export type LinkType = Record<PropertyKey, never>;

/** Codec for `<LinkType>`. Placeholder: no fields yet. */
export const linkType: XmlParam<"LinkType", LinkType> = xmlParam(
  "LinkType",
  {},
);
