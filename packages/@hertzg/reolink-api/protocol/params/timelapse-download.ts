/**
 * `<timelapseDownload>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseDownload>`. Placeholder: no fields yet. */
export type TimelapseDownload = Record<PropertyKey, never>;

/** Codec for `<timelapseDownload>`. Placeholder: no fields yet. */
export const timelapseDownload: XmlParam<
  "timelapseDownload",
  TimelapseDownload
> = xmlParam(
  "timelapseDownload",
  {},
);
