/**
 * `<AgingTest>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<AgingTest>`. Placeholder: no fields yet. */
export type AgingTest = Record<PropertyKey, never>;

/** Codec for `<AgingTest>`. Placeholder: no fields yet. */
export const agingTest: XmlParam<"AgingTest", AgingTest> = xmlParam(
  "AgingTest",
  {},
);
