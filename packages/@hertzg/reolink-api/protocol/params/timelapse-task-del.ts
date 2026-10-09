/**
 * `<timelapseTaskDel>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseTaskDel>`. Placeholder: no fields yet. */
export type TimelapseTaskDel = Record<PropertyKey, never>;

/** Codec for `<timelapseTaskDel>`. Placeholder: no fields yet. */
export const timelapseTaskDel: XmlParam<"timelapseTaskDel", TimelapseTaskDel> =
  xmlParam(
    "timelapseTaskDel",
    {},
  );
