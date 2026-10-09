/**
 * `<timelapseDateTbl>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<timelapseDateTbl>`. Placeholder: no fields yet. */
export type TimelapseDateTbl = Record<PropertyKey, never>;

/** Codec for `<timelapseDateTbl>`. Placeholder: no fields yet. */
export const timelapseDateTbl: XmlParam<"timelapseDateTbl", TimelapseDateTbl> =
  xmlParam(
    "timelapseDateTbl",
    {},
  );
