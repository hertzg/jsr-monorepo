/**
 * `<imageFileInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<imageFileInfo>`. Placeholder: no fields yet. */
export type ImageFileInfo = Record<PropertyKey, never>;

/** Codec for `<imageFileInfo>`. Placeholder: no fields yet. */
export const imageFileInfo: XmlParam<"imageFileInfo", ImageFileInfo> = xmlParam(
  "imageFileInfo",
  {},
);
