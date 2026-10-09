/**
 * `<timelapseFileSearch>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseFileSearch>`. Placeholder: no fields yet. */
export type TimelapseFileSearch = Record<PropertyKey, never>;

/** Codec for `<timelapseFileSearch>`. Placeholder: no fields yet. */
export const timelapseFileSearch: XmlParam<
  "timelapseFileSearch",
  TimelapseFileSearch
> = xmlParam(
  "timelapseFileSearch",
  {},
);
