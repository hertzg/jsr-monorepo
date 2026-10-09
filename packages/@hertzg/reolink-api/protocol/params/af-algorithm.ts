/**
 * `<afAlgorithm>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<afAlgorithm>`. Placeholder: no fields yet. */
export type AfAlgorithm = Record<PropertyKey, never>;

/** Codec for `<afAlgorithm>`. Placeholder: no fields yet. */
export const afAlgorithm: XmlParam<"afAlgorithm", AfAlgorithm> = xmlParam(
  "afAlgorithm",
  {},
);
