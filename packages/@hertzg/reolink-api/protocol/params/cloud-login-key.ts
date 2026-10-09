/**
 * `<CloudLoginKey>`: placeholder until its fields are recovered from firmware.
 *
 * @module
 */

import { type XmlParam, xmlParam } from "../xml.ts";

/** The value of `<CloudLoginKey>`. Placeholder: no fields yet. */
export type CloudLoginKey = Record<PropertyKey, never>;

/** Codec for `<CloudLoginKey>`. Placeholder: no fields yet. */
export const cloudLoginKey: XmlParam<"CloudLoginKey", CloudLoginKey> = xmlParam(
  "CloudLoginKey",
  {},
);
