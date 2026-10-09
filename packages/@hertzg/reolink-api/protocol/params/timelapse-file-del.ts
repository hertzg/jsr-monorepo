/**
 * `<timelapseFileDel>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseFileDel>`. Placeholder: no fields yet. */
export type TimelapseFileDel = Record<PropertyKey, never>;

/** Codec for `<timelapseFileDel>`. Placeholder: no fields yet. */
export const timelapseFileDel: XmlParam<"timelapseFileDel", TimelapseFileDel> =
  xmlParam(
    "timelapseFileDel",
    {},
  );
