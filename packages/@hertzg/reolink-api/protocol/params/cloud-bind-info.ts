/**
 * `<CloudBindInfo>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<CloudBindInfo>`. Placeholder: no fields yet. */
export type CloudBindInfo = Record<PropertyKey, never>;

/** Codec for `<CloudBindInfo>`. Placeholder: no fields yet. */
export const cloudBindInfo: XmlParam<"CloudBindInfo", CloudBindInfo> = xmlParam(
  "CloudBindInfo",
  {},
);
