/**
 * `<Preview>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<Preview>`. Placeholder: no fields yet. */
export type Preview = Record<PropertyKey, never>;

/** Codec for `<Preview>`. Placeholder: no fields yet. */
export const preview: XmlParam<"Preview", Preview> = xmlParam(
  "Preview",
  {},
);
