/**
 * `<ImageCheck>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<ImageCheck>`. Placeholder: no fields yet. */
export type ImageCheck = Record<PropertyKey, never>;

/** Codec for `<ImageCheck>`. Placeholder: no fields yet. */
export const imageCheck: XmlParam<"ImageCheck", ImageCheck> = xmlParam(
  "ImageCheck",
  {},
);
